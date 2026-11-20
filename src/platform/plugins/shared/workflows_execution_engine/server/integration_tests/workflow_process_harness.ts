/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any, @kbn/eslint/require_kbn_fs */

import type { Client } from '@elastic/elasticsearch';
import { execFileSync } from 'child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import type { IncomingHttpHeaders, Server } from 'http';
import type { AddressInfo } from 'net';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { fetch as undiciFetch } from 'undici';
import { configSchema as actionsConfigSchema } from '@kbn/actions-plugin/server/config';
import type { InMemoryConnector } from '@kbn/actions-plugin/server/types';
import { configSchema as alertingConfigSchema } from '@kbn/alerting-plugin/server/config';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import eventLogMappings from '@kbn/event-log-plugin/generated/mappings.json';
import { FieldsMetadataService } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/fields_metadata_service';
import { License } from '@kbn/licensing-plugin/common/license';
import { featureUsageSavedObjectType } from '@kbn/licensing-plugin/server/services/feature_usage_store';
import type { MetricResourceSnapshot } from '@kbn/metrics';
import { kibanaPackageJson, REPO_ROOT } from '@kbn/repo-info';
import { config as ruleRegistryConfig } from '@kbn/rule-registry-plugin/server/config';
import {
  createConfig as createSecurityConfig,
  ConfigSchema as securityConfigSchema,
} from '@kbn/security-plugin/server/config';
import { getTaskProcessSettings as getSecurityTaskProcessSettings } from '@kbn/security-plugin/server/task_plugin';
import { ConfigSchema as spacesConfigSchema } from '@kbn/spaces-plugin/server/config';
import { ApiKeyType } from '@kbn/task-manager-plugin/server/config';
import { TASK_MANAGER_CLAIM_NUDGE_INDEX } from '@kbn/task-manager-plugin/server/constants';
import { startTaskProcessCore } from '@kbn/task-manager-plugin/server/task_process/core_process';
import { elasticsearchConfigFromEnv } from '@kbn/task-manager-plugin/server/task_process/es_config';
import type { TaskFeatureFlagDefinitions } from '@kbn/task-manager-plugin/server/task_process/feature_flag_declarations';
import { collectRemoteGaugeMetrics } from '@kbn/task-manager-plugin/server/task_process/metrics_transport';
import { TASK_PROCESS_PROTOCOL_VERSION } from '@kbn/task-manager-plugin/server/task_process/protocol';
import { RemoteTaskRunner } from '@kbn/task-manager-plugin/server/task_process/remote_task_runner';
import type { TaskProcessDispatch } from '@kbn/task-manager-plugin/server/task_process/remote_task_runner';
import { runInRunContext } from '@kbn/task-manager-plugin/server/task_process/run_context';
import { serializeSettings } from '@kbn/task-manager-plugin/server/task_process/settings';
import { TaskProcessSupervisor } from '@kbn/task-manager-plugin/server/task_process/supervisor';
import type { TaskBundleManifest } from '@kbn/task-manager-plugin/server/task_process/supervisor';
import type {
  TaskProcessInit,
  TaskProcessRunRequest,
} from '@kbn/task-manager-plugin/server/task_process/wire';
import { startTaskProcessWorker } from '@kbn/task-manager-plugin/server/task_process/worker';
import type { TaskExecutionPool } from '@kbn/task-manager-plugin/server/task_scheduling';
import { TASK_SCHEDULING_CONTRIBUTIONS_KEY } from '@kbn/task-manager-plugin/server/task_scheduling_contribution';
import { TaskSchedulingDefinitions } from '@kbn/task-manager-plugin/server/task_scheduling_definition_registry';
import { createTaskSchedulingSnapshot } from '@kbn/task-manager-plugin/server/task_scheduling_snapshot';
import type { TaskManagerTaskProcessSettings } from '@kbn/task-manager-plugin/server/task_scheduling_snapshot';
import type { TaskHost, TaskTypeModule } from '@kbn/task-manager-plugin/server/task_type_module';
import { registerUsageCountersSavedObjectTypes } from '@kbn/usage-collection-plugin/server/usage_counters/saved_objects';
import { WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG } from '@kbn/workflows';
import { WORKFLOW_INDEX_NAME } from '@kbn/workflows/server/constants';
import { config as engineConfigDescriptor } from '../config';
import { installWorkflowDataStreamTemplates } from '../data_streams';
import {
  createOrUpdateIndex,
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from '../repositories/data_access_layer';
import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM,
  WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
} from '../repositories/data_access_layer/implementations/data_stream/constants';
import { contribution as workflowTaskSchedulingContribution } from '../task_types/task_scheduling_contribution';
import { taskType as scheduledTaskType } from '../task_types/workflow_scheduled.task';
import { WORKFLOW_TASK_SCHEDULING_DEFINITIONS } from '../workflow_task_manager/task_scheduling_definitions';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getTaskBundleEntries, buildTaskBundle } = require(join(
  REPO_ROOT,
  'src/dev/task_bundles/build'
));

const KIBANA_VERSION = kibanaPackageJson.version;
const KIBANA_UUID = '5b2de169-2785-441b-ae8c-186a1936b17d';
const ENCRYPTION_KEY = 'a'.repeat(32);
const TASK_TYPE = 'workflow:scheduled';
const BUNDLE_NAME = 'workflowsExecutionEngine__workflow_scheduled';

interface ExecutionTaskFixture {
  taskType: TaskTypeModule;
  file: string;
  name: string;
}

const bundleBuilds = new Map<string, Promise<string>>();
const getWorkflowBundles = (
  includeRunTask: boolean,
  additionalContributions: Record<string, string[]> = {},
  includeResumeTask: boolean = false,
  executionTask?: ExecutionTaskFixture
): Promise<string> => {
  const key = JSON.stringify({
    includeRunTask,
    includeResumeTask,
    additionalContributions,
    executionTask: executionTask && {
      file: executionTask.file,
      name: executionTask.name,
      type: executionTask.taskType.type,
    },
  });
  const existing = bundleBuilds.get(key);
  if (existing) return existing;
  const build = async () => {
    const bundleDir = mkdtempSync(join(tmpdir(), 'task-bundles-'));
    const prebuiltDir = process.env.KBN_TASK_BUNDLE_TEST_DIR;
    if (prebuiltDir) cpSync(prebuiltDir, bundleDir, { recursive: true });
    const entries = executionTask
      ? [
          {
            file: executionTask.file,
            name: executionTask.name,
            pluginId: 'workflowsExecutionEngine',
          },
        ]
      : getTaskBundleEntries().filter(
          ({ name }: { name: string }) =>
            name === BUNDLE_NAME ||
            (includeRunTask && name === 'workflowsExecutionEngine__workflow_run') ||
            (includeResumeTask && name === 'workflowsExecutionEngine__workflow_resume')
        );
    const prebuiltManifest =
      prebuiltDir && existsSync(join(prebuiltDir, 'manifest.json'))
        ? (JSON.parse(
            readFileSync(join(prebuiltDir, 'manifest.json'), 'utf8')
          ) as TaskBundleManifest)
        : undefined;
    const built: Array<{ name: string; featureFlags?: TaskFeatureFlagDefinitions }> = [];
    for (const entry of entries) {
      if (prebuiltDir) {
        if (!existsSync(join(bundleDir, `${entry.name}.mjs`))) {
          throw new Error(`Missing prebuilt workflow task bundle ${entry.name} in ${prebuiltDir}`);
        }
        built.push({
          name: entry.name,
          featureFlags: prebuiltManifest?.bundles[entry.name]?.featureFlags,
        });
      } else {
        built.push(await buildTaskBundle({ entry, outDir: bundleDir, additionalContributions }));
      }
    }
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        bundles: Object.fromEntries(
          built.map(({ name, featureFlags }) => [
            name,
            {
              file: `${name}.mjs`,
              featureFlags,
              taskType:
                name === executionTask?.name
                  ? executionTask.taskType.type
                  : name === BUNDLE_NAME
                  ? TASK_TYPE
                  : name.endsWith('__workflow_resume')
                  ? 'workflow:resume'
                  : 'workflow:run',
            },
          ])
        ),
      })
    );
    return bundleDir;
  };
  const promise = build();
  bundleBuilds.set(key, promise);
  return promise;
};

export const WORKFLOW_PROCESS_TEST_MODES = [
  { mode: 'child_process', reuse: false },
  { mode: 'child_process', reuse: true },
  { mode: 'remote', reuse: false },
  { mode: 'remote', reuse: true },
] as const;

export interface StubRequest {
  url?: string;
  method?: string;
  headers: IncomingHttpHeaders;
  body: string;
}

export interface WorkflowProcessHarnessOptions {
  logger?: Logger;
  mode?: 'child_process' | 'remote';
  serverUuid?: string;
  reuse?: boolean;
  useElasticsearchServiceAccount?: boolean;
  maxIdleProcesses?: number;
  includeRunTask?: boolean;
  includeResumeTask?: boolean;
  claimNudge?: boolean;
  executionTask?: ExecutionTaskFixture;
  middlewareIds?: string[];
  /** Captures additional native task registrations present in the dispatching Main instance. */
  registerTaskSchedulingDefinitions?: (definitions: TaskSchedulingDefinitions) => void;
  instrumentation?: TaskProcessInit['instrumentation'];
  onMetrics?: TaskProcessDispatch['onMetrics'];
  executionContext?: TaskProcessInit['executionContext'];
  getCurrentTasksInPool?: TaskExecutionPool['getCurrentTasksInPool'];
  /**
   * The pack ids a worker is initialized with (`TaskProcessInit.packs`), as
   * `resolveWorkflowTaskPacks` would resolve them for the workflow under test. `undefined` (the
   * default) asks for every pack, the pre-pack behavior.
   */
  packs?: string[];
  /** Connectors a run has without a saved object, such as a system connector a test registers. */
  inMemoryConnectors?: InMemoryConnector[];
  additionalContributions?: Record<string, string[]>;
  featureFlags?: Record<string, boolean | string | number>;
  getFeatureFlags?: TaskProcessDispatch['getFeatureFlags'];
  /** The workflows to seed (a `scheduled` trigger is added unless `triggers` is given), by id. */
  workflows: Record<
    string,
    {
      name?: string;
      steps: unknown[];
      triggers?: unknown[];
      outputs?: Array<{ name: string; type: string }>;
    }
  >;
  /** Answers the calls of the process to Kibana (its self client); 200 with `{}` by default. */
  kibanaHandler?: (request: StubRequest) => { status?: number; body: unknown };
  /** The configs the steps read, by plugin id, added to the ones of the engine. */
  settings?: Record<string, unknown>;
  /**
   * What this Kibana has registered, by kind (`TaskTypeRegistrationOptions.parity`): sent to the process
   * with its init, which hands it to the module as `host.parity`.
   */
  parity?: Array<{ kind: string; ids: string[] }>;
  /** Saved object types the plugin of the steps registers, whose indices Kibana would have. */
  savedObjectTypes?: Array<{ name: string; mappings: unknown; indexPattern?: string }>;
  /**
   * What the plugins contribute to the module, by contribution key, for the process that seeds: it
   * then registers the saved object types the contributions declare (the bundle's process always does).
   */
  seedContributions?: Record<string, unknown[]>;
  /**
   * Seeds what Kibana would have, with the host of a process of the module (saved objects, whose
   * client encrypts the attributes of the encrypted types, such as the `secrets` of a connector) and the ES client.
   */
  seed?: (context: { es: Client; host: TaskHost; kibanaUrl: string }) => Promise<void>;
}

const createTaskManagerSettings = (
  definitions: TaskSchedulingDefinitions,
  claimNudge: boolean,
  middlewareIds: string[] = []
): TaskManagerTaskProcessSettings => ({
  api_key_type: ApiKeyType.ES,
  grant_uiam_api_keys: false,
  scheduling: {
    taskManagerId: `kibana:${KIBANA_UUID}`,
    securityEnabled: true,
    middlewareIds: [...middlewareIds],
    allowReadingInvalidState: false,
    definitions: createTaskSchedulingSnapshot(definitions),
    ...(claimNudge ? { claimNudge: { index: TASK_MANAGER_CLAIM_NUDGE_INDEX } } : {}),
  },
});

const createFixtureSchedulingDefinitions = (
  executionTask?: ExecutionTaskFixture,
  registerDefinitions?: WorkflowProcessHarnessOptions['registerTaskSchedulingDefinitions']
): TaskSchedulingDefinitions => {
  const definitions = new TaskSchedulingDefinitions();
  definitions.registerTaskDefinitions(WORKFLOW_TASK_SCHEDULING_DEFINITIONS);
  if (executionTask)
    definitions.registerTaskDefinitions({ [executionTask.taskType.type]: executionTask.taskType });
  registerDefinitions?.(definitions);
  return definitions;
};

const createSeedContributions = (
  contributions: WorkflowProcessHarnessOptions['seedContributions'] = {}
): NonNullable<WorkflowProcessHarnessOptions['seedContributions']> => ({
  ...contributions,
  [TASK_SCHEDULING_CONTRIBUTIONS_KEY]: [
    workflowTaskSchedulingContribution,
    ...(contributions[TASK_SCHEDULING_CONTRIBUTIONS_KEY] ?? []),
  ],
});

const runSeed = async (
  seed: NonNullable<WorkflowProcessHarnessOptions['seed']>,
  context: Parameters<NonNullable<WorkflowProcessHarnessOptions['seed']>>[0]
): Promise<void> => {
  const { error } = await runInRunContext(() => seed(context));
  if (error !== undefined) throw error;
};

const getExecutionStorage = (options: Pick<WorkflowProcessHarnessOptions, 'settings'>) => {
  const engineConfig = engineConfigDescriptor.schema.validate(
    options.settings?.workflowsExecutionEngine ?? {}
  );
  const executionsIndex =
    engineConfig.storage.source === 'data_stream'
      ? WORKFLOWS_EXECUTIONS_DATA_STREAM
      : WORKFLOWS_EXECUTIONS_INDEX;
  const stepsIndex =
    engineConfig.storage.source === 'data_stream'
      ? WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM
      : WORKFLOWS_STEP_EXECUTIONS_INDEX;
  return { engineConfig, executionsIndex, stepsIndex };
};

/** The live resident memory of a real OS process, in MB; `undefined` once the process has exited. */
export const readProcessRssMb = (pid: number): number | undefined => {
  try {
    const kb = Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }));
    return Number.isFinite(kb) ? kb / 1024 : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Real Elasticsearch, a stub of Kibana and the real `workflow:scheduled` bundle in a real task
 * process, with what Kibana would have installed (saved object and execution indices, data stream
 * templates, the event log) and some workflows seeded. A test asserts what a run did.
 */
const startHarness = async (
  options: WorkflowProcessHarnessOptions,
  cleanups: Array<() => Promise<unknown>>
) => {
  const { engineConfig, executionsIndex, stepsIndex } = getExecutionStorage(options);
  const kibanaRequests: StubRequest[] = [];
  let apiKey = '';

  const kibanaStub: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const request = { url: req.url, method: req.method, headers: req.headers, body };
      kibanaRequests.push(request);
      const answer = options.kibanaHandler?.(request) ?? { body: {} };
      res.writeHead(answer.status ?? 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(answer.body));
    });
  });
  await new Promise<void>((resolve) => kibanaStub.listen(0, '127.0.0.1', resolve));
  cleanups.push(() => new Promise((resolve) => kibanaStub.close(resolve)));
  const kibanaUrl = `http://127.0.0.1:${(kibanaStub.address() as AddressInfo).port}`;

  const taskSchedulingDefinitions = createFixtureSchedulingDefinitions(
    options.executionTask,
    options.registerTaskSchedulingDefinitions
  );
  const licenseExpiryDate = Date.now() + 86400000;
  const settings = () => ({
    fieldsMetadataRuntime: new FieldsMetadataService(
      loggingSystemMock.createLogger()
    ).getTaskProcessSettings(),
    evalsTaskProviders: { names: ['inference', 'agentBuilder.converse'] },
    spacesRuntime: {
      config: spacesConfigSchema.validate({}, { offering: 'traditional' }),
      buildFlavor: 'traditional',
      features: [],
      cpsEnabled: false,
    },
    workflowsManagementRuntime: { available: true, managedWorkflowPluginIds: [] },
    inferenceFeatures: { features: [] },
    contextEngineManagedAiIndices: { registrations: [] },
    actions: actionsConfigSchema.validate({ allowedHosts: ['*'], enableFooterInEmail: false }),
    actionsConnectors: { inMemoryConnectors: options.inMemoryConnectors ?? [] },
    alerting: alertingConfigSchema.validate({}),
    ruleRegistry: ruleRegistryConfig.schema.validate({}),
    taskManager: createTaskManagerSettings(
      taskSchedulingDefinitions,
      options.claimNudge === true,
      options.middlewareIds
    ),
    workflowsExecutionEngineCloud: { serverless: { projectId: 'project-1' } },
    security: getSecurityTaskProcessSettings({
      license: new License({
        license: {
          uid: 'uid',
          type: 'trial',
          mode: 'trial',
          status: 'active',
          expiryDateInMillis: licenseExpiryDate,
        },
        features: { security: { isAvailable: true, isEnabled: true } },
        signature: 'sig',
      }),
      config: createSecurityConfig(
        securityConfigSchema.validate({ audit: { enabled: false } }),
        loggingSystemMock.create().get(),
        { isTLSEnabled: false }
      ),
      applicationName: 'kibana-.kibana',
      kibanaServerResourceURL: 'http://localhost:5601',
    }),
    ...options.settings,
    workflowsExecutionEngine: engineConfig,
  });

  const initFor = () => ({
    instrumentation: options.instrumentation,
    executionContext: options.executionContext,
    server: {
      uuid: options.serverUuid ?? KIBANA_UUID,
      buildNum: 1,
      isServerless: false,
      publicBaseUrl: kibanaUrl,
    },
    encryptedSavedObjects: { encryptionKey: ENCRYPTION_KEY, decryptionOnlyKeys: [] },
    ...(options.parity ? { parity: options.parity } : {}),
    ...(options.packs ? { packs: options.packs } : {}),
    settings: Object.fromEntries(
      Object.entries(settings()).map(([id, config]) => [id, serializeSettings(config)])
    ) as never,
  });

  const { startES } = createTestServers({
    adjustTimeout: (t) => jest.setTimeout(t),
    settings: { es: { license: 'trial' } },
  });
  const esServer: TestElasticsearchUtils = await startES();
  cleanups.push(() => esServer.stop());
  const es: Client = esServer.es.getClient();
  const serviceAccountToken = options.useElasticsearchServiceAccount
    ? (
        await es.security.createServiceToken({
          namespace: 'elastic',
          service: 'kibana',
          name: 'native-workflow-process',
        })
      ).token.value
    : undefined;
  const esConfig = () => {
    const connection = elasticsearchConfigFromEnv({
      ES_URL: esServer.hosts[0],
      ES_USERNAME: esServer.username,
      ES_PASSWORD: esServer.password,
    });
    if (serviceAccountToken) {
      delete connection.username;
      delete connection.password;
      connection.serviceAccountToken = serviceAccountToken;
    }
    return connection;
  };

  // The saved object indices Kibana has: what the module declares, `config` and `task`.
  const indexMappings = new Map<string, Record<string, unknown>>();
  const usageCounterTypes: SavedObjectsType[] = [];
  registerUsageCountersSavedObjectTypes({
    registerType: (type) => {
      usageCounterTypes.push(type);
    },
  });
  for (const type of [
    ...usageCounterTypes,
    featureUsageSavedObjectType,
    ...(scheduledTaskType.savedObjectTypes ?? []),
    ...(options.savedObjectTypes ?? []),
  ]) {
    const index = type.indexPattern ?? '.kibana';
    indexMappings.set(index, {
      ...(indexMappings.get(index) ?? {}),
      [type.name]: type.mappings,
    });
  }
  indexMappings.set('.kibana', {
    ...(indexMappings.get('.kibana') ?? {}),
    config: { properties: { buildNum: { type: 'integer' } } },
  });
  indexMappings.set('.kibana_task_manager', {
    ...(indexMappings.get('.kibana_task_manager') ?? {}),
    task: {
      properties: {
        taskType: { type: 'keyword' },
        scope: { type: 'keyword' },
        enabled: { type: 'boolean' },
        status: { type: 'keyword' },
        runAt: { type: 'date' },
      },
    },
  });
  for (const [index, properties] of indexMappings) {
    await es.indices.create({
      index: `${index}_${KIBANA_VERSION}_001`,
      aliases: { [index]: {}, [`${index}_${KIBANA_VERSION}`]: {} },
      mappings: {
        dynamic: false,
        properties: {
          type: { type: 'keyword' },
          namespace: { type: 'keyword' },
          namespaces: { type: 'keyword' },
          updated_at: { type: 'date' },
          references: {
            type: 'nested',
            properties: {
              name: { type: 'keyword' },
              type: { type: 'keyword' },
              id: { type: 'keyword' },
            },
          },
          ...Object.fromEntries(
            Object.entries(properties).map(([name, mapping]) => [
              name,
              (mapping as { properties?: unknown })?.properties
                ? { properties: (mapping as { properties: unknown }).properties }
                : mapping,
            ])
          ),
        },
      } as never,
    });
  }
  await es.indices.putIndexTemplate({
    name: '.kibana-event-log-template',
    index_patterns: ['.kibana-event-log-*'],
    data_stream: { hidden: true },
    priority: 100,
    template: { mappings: eventLogMappings as never },
  });
  await es.indices.createDataStream({ name: '.kibana-event-log-ds' });

  // What Kibana installs for the engine: the execution indices, the data stream templates and the workflows index.
  const logger = options.logger ?? loggingSystemMock.createLogger();
  await createOrUpdateIndex({
    esClient: es,
    indexName: WORKFLOWS_EXECUTIONS_INDEX,
    mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    logger,
  });
  await createOrUpdateIndex({
    esClient: es,
    indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
    mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
    logger,
  });
  await installWorkflowDataStreamTemplates({ esClient: es, logger, storage: engineConfig.storage });
  await es.indices.create({
    index: WORKFLOW_INDEX_NAME,
    mappings: {
      dynamic: false,
      properties: {
        spaceId: { type: 'keyword' },
        enabled: { type: 'boolean' },
        triggerTypes: { type: 'keyword' },
        managed: { type: 'boolean' },
        deleted_at: { type: 'date' },
        updated_at: { type: 'date' },
        created_at: { type: 'date' },
        yaml: { type: 'text', index: false },
        definition: { type: 'object', enabled: false },
      },
    },
  });
  const now = new Date().toISOString();
  await es.index({
    index: '.kibana',
    id: 'space:default',
    refresh: 'wait_for',
    document: { type: 'space', space: { name: 'Default', disabledFeatures: [] }, references: [] },
  });
  for (const [id, { name = id, steps, triggers, outputs }] of Object.entries(options.workflows)) {
    const definedTriggers = triggers ?? [{ type: 'scheduled', with: { every: '1d' } }];
    await es.index({
      index: WORKFLOW_INDEX_NAME,
      id,
      refresh: 'wait_for',
      document: {
        name,
        enabled: true,
        tags: [],
        triggerTypes: definedTriggers.map((trigger) => (trigger as { type: string }).type),
        yaml: `name: ${name}`,
        definition: {
          name,
          enabled: true,
          version: '1',
          triggers: definedTriggers,
          steps,
          ...(outputs ? { outputs } : {}),
        },
        createdBy: 'elastic',
        lastUpdatedBy: 'elastic',
        spaceId: 'default',
        valid: true,
        deleted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  ({ encoded: apiKey } = await es.security.createApiKey({ name: 'workflow-key' }));

  const seed = options.seed;
  if (seed) {
    // A process of the module, to seed what Kibana would have saved, such as connectors.
    const seeder = await startTaskProcessCore({
      init: {
        kind: 'init',
        elasticsearch: esConfig(),
        kibanaVersion: KIBANA_VERSION,
        authToken: '',
        ...initFor(),
      },
      module: options.executionTask?.taskType ?? scheduledTaskType,
      contributions: createSeedContributions(options.seedContributions),
    });
    try {
      await runSeed(seed, { es, host: seeder.host, kibanaUrl });
    } finally {
      await seeder.stop();
    }
  }

  const bundleDir = await getWorkflowBundles(
    options.includeRunTask === true,
    options.additionalContributions,
    options.includeResumeTask === true,
    options.executionTask
  );
  const workerSettings = {
    bundle_dir: bundleDir,
    kibanaVersion: KIBANA_VERSION,
    ...(options.reuse
      ? {
          reuse: {
            idleTimeoutMs: 30000,
            maxAgeMs: 300000,
            maxRuns: 50,
            maxIdleProcesses: options.maxIdleProcesses ?? 2,
          },
        }
      : {}),
  };
  let getRoute: TaskProcessSupervisor['getRoute'];
  let getWorkerStats: TaskProcessSupervisor['getStats'];
  let getProcessPids: TaskProcessSupervisor['getProcessPids'];
  let collectGaugeMetrics: (owner?: string) => Promise<MetricResourceSnapshot[]>;
  if (options.mode === 'remote') {
    const worker = startTaskProcessWorker({
      settings: workerSettings,
      logger,
      authToken: 'workflow-test-worker',
      port: 0,
      host: '127.0.0.1',
    });
    cleanups.push(worker.stop);
    getWorkerStats = worker.getStats;
    getProcessPids = () => worker.supervisor.getProcessPids();
    await new Promise<void>((resolve) => worker.server.once('listening', resolve));
    const address = worker.server.address();
    if (!address || typeof address === 'string')
      throw new Error('The workflow test worker has no listening address');
    const remote = { url: `http://127.0.0.1:${address.port}`, token: 'workflow-test-worker' };
    getRoute = () => remote;
    collectGaugeMetrics = (owner = options.serverUuid ?? KIBANA_UUID) =>
      collectRemoteGaugeMetrics(remote, owner);
  } else {
    const supervisor = new TaskProcessSupervisor({
      settings: { ...workerSettings, getElasticsearchConfig: esConfig, getInitFor: initFor },
      logger,
    });
    supervisor.start();
    cleanups.push(() => supervisor.stop());
    getRoute = (taskType) => supervisor.getRoute(taskType);
    getWorkerStats = () => supervisor.getStats();
    getProcessPids = () => supervisor.getProcessPids();
    collectGaugeMetrics = (owner = options.serverUuid ?? KIBANA_UUID) =>
      supervisor.collectGaugeMetrics(owner);
  }

  const createdTaskCounts: number[] = [];
  /**
   * Builds the `RemoteTaskRunner` of a run without starting it, so a test can `cancel()` it while
   * `promise` (its `run()`) is still pending — `runTask` only hands back that promise.
   */
  const runTaskHandle = (
    taskType: string,
    task: { id: string; params: Record<string, string> },
    onDispatchFailure?: TaskProcessDispatch['onDispatchFailure'],
    credentials?: { apiKey: string; userName?: string; spaceId?: string },
    tracing?: TaskProcessRunRequest['tracing']
  ) => {
    const runner = new RemoteTaskRunner({
      route: getRoute(taskType),
      request: {
        taskType,
        tracing,
        ...(options.mode === 'remote'
          ? {
              snapshot: {
                protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
                init: { ...initFor(), kibanaVersion: KIBANA_VERSION, elasticsearch: esConfig() },
                featureFlags: {
                  [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: true,
                  ...options.featureFlags,
                },
              },
            }
          : {}),
        taskInstance: {
          id: task.id,
          taskType,
          params: task.params,
          state: {},
          attempts: 1,
          status: 'running',
          scheduledAt: new Date().toISOString(),
          runAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          retryAt: null,
          ownerId: null,
        },
        executionUuid: `${task.id}-${Date.now()}`,
        apiKey: credentials?.apiKey ?? apiKey,
        spaceId: credentials?.spaceId ?? 'default',
        userName: credentials?.userName ?? 'elastic',
        featureFlags: { [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: true, ...options.featureFlags },
        kibanaVersion: KIBANA_VERSION,
        cancelGracePeriodMs: 5000,
      },
      timeoutMs: 120000,
      setCustomTaskRunEventFields: jest.fn(),
      onDispatchFailure,
      onTasksCreated: (count) => createdTaskCounts.push(count),
      onMetrics: options.onMetrics,
      getCurrentTasksInPool: options.getCurrentTasksInPool,
      getFeatureFlags:
        options.getFeatureFlags ??
        (async (_taskType, declarations) => ({
          ...declarations,
          [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: true,
          ...options.featureFlags,
        })),
      fetchFn: undiciFetch as unknown as typeof fetch,
    });
    return { runner, promise: runner.run() };
  };

  /** Runs the scheduled task of a workflow in the process; `onDispatchFailure` observes dispatch failures. */
  const runTask = (
    taskType: string,
    task: { id: string; params: Record<string, string> },
    onDispatchFailure?: TaskProcessDispatch['onDispatchFailure'],
    credentials?: { apiKey: string; userName?: string; spaceId?: string },
    tracing?: TaskProcessRunRequest['tracing']
  ) => runTaskHandle(taskType, task, onDispatchFailure, credentials, tracing).promise;

  const run = (
    workflowId: string,
    onDispatchFailure?: TaskProcessDispatch['onDispatchFailure'],
    credentials?: { apiKey: string; userName?: string; spaceId?: string }
  ) =>
    runTask(
      TASK_TYPE,
      {
        id: `workflow:${workflowId}:scheduled`,
        params: { workflowId, spaceId: 'default', triggerType: 'scheduled' },
      },
      onDispatchFailure,
      credentials
    );

  const waitForRunTask = async (workflowId: string | RegExp, signal?: AbortSignal) => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      signal?.throwIfAborted();
      await es.indices.refresh({ index: '.kibana_task_manager' });
      const { hits } = await es.search<{ task: { params: string } }>({
        index: '.kibana_task_manager',
        query: { term: { 'task.taskType': 'workflow:run' } },
      });
      for (const hit of hits.hits) {
        if (hit._source && hit._id) {
          const params = JSON.parse(hit._source.task.params) as {
            workflowRunId: string;
            spaceId: string;
          };
          await es.indices.refresh({ index: executionsIndex });
          const { hits: executionHits } = await es.search<{ workflowId: string; status: string }>({
            index: executionsIndex,
            query: { ids: { values: [params.workflowRunId] } },
          });
          const execution = executionHits.hits[0];
          const matchesWorkflow =
            execution?._source &&
            (typeof workflowId === 'string'
              ? execution._source.workflowId === workflowId
              : workflowId.test(execution._source.workflowId));
          if (matchesWorkflow && execution?._source?.status === 'pending')
            return { id: hit._id.replace(/^task:/, ''), params };
        }
      }
      await sleep(100, undefined, { signal });
    }
    throw new Error(`No workflow:run task was scheduled for ${workflowId}`);
  };

  type Document = Record<string, any>;
  const findDocuments = async (
    index: string,
    field: 'workflowId' | 'workflowRunId',
    id: string
  ): Promise<Document[]> => {
    await es.indices.refresh({ index });
    const documents: Document[] = [];
    for await (const page of es.helpers.scrollSearch<Document>({
      index,
      size: 1000,
      query: { term: { [field]: id } },
    })) {
      documents.push(...page.documents);
    }
    return documents;
  };
  const executionsOf = (workflowId: string): Promise<Document[]> =>
    findDocuments(executionsIndex, 'workflowId', workflowId);
  const stepsOf = (executionId: string): Promise<Document[]> =>
    findDocuments(stepsIndex, 'workflowRunId', executionId);

  /**
   * Runs `run(workflowId, ...)` and reads the RSS of the real OS process that served it, just after
   * the process picks up the run (a real sample, not the ready/idle/afterRun bracket `bench.js` gets
   * by owning the fork directly: the supervisor's pooling means this harness only sees a process once
   * it is live) and again right after the run resolves.
   */
  const runMeasured = async (
    ...args: Parameters<typeof run>
  ): Promise<{
    result: Awaited<ReturnType<typeof run>>;
    pid: number | undefined;
    startRssMb: number | undefined;
    afterRunRssMb: number | undefined;
  }> => {
    const before = new Set(getProcessPids());
    const resultPromise = run(...args);
    let pid: number | undefined;
    const deadline = Date.now() + 10000;
    while (!pid && Date.now() < deadline) {
      pid = getProcessPids().find((candidate) => !before.has(candidate));
      if (!pid) await sleep(20);
    }
    const startRssMb = pid !== undefined ? readProcessRssMb(pid) : undefined;
    const result = await resultPromise;
    const servingPid = pid ?? getProcessPids()[0];
    const afterRunRssMb = servingPid !== undefined ? readProcessRssMb(servingPid) : undefined;
    return { result, pid: servingPid, startRssMb, afterRunRssMb };
  };

  return {
    es,
    apiKey,
    kibanaUrl,
    kibanaRequests,
    run,
    runTask,
    runTaskHandle,
    runMeasured,
    getProcessPids,
    waitForRunTask,
    getWorkerStats,
    collectGaugeMetrics,
    createdTaskCounts,
    executionsOf,
    stepsOf,
    stop: async () => {
      for (const cleanup of cleanups.reverse()) await cleanup();
    },
  };
};

/** The harness; whatever it started is stopped when its setup fails, so a failed setup leaves nothing running. */
export const startWorkflowProcessHarness = async (options: WorkflowProcessHarnessOptions) => {
  const cleanups: Array<() => Promise<unknown>> = [];
  try {
    return await startHarness(options, cleanups);
  } catch (error) {
    for (const cleanup of cleanups.reverse()) await cleanup().catch(() => {});
    throw error;
  }
};
