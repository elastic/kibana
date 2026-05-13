/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import type { KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowExecutionEngineModel, WorkflowYaml } from '@kbn/workflows';
import type {
  ManagedWorkflowDefinition,
  ManagedWorkflowId,
  ManagedWorkflowManagement,
  ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { ManagedWorkflowsService } from './managed_workflows_service';
import type { VersionedWorkflowDocument, WorkflowCrudService } from './workflow_crud_service';
import type { WorkflowProperties } from '../storage/workflow_storage';

let mockManagedWorkflowDefinitions: ManagedWorkflowDefinition[] = [];

jest.mock('@kbn/workflows/managed', () => ({
  getManagedWorkflowDefinition: (id: string) =>
    mockManagedWorkflowDefinitions.find((definition) => definition.id === id),
  getManagedWorkflowDefinitions: () => [...mockManagedWorkflowDefinitions],
}));

const PLUGIN_ID = 'testPlugin';
const WORKFLOW_ID = 'system-test-workflow' as ManagedWorkflowId;
const SPACE_ID = 'default';

const defaultManagement: ManagedWorkflowManagement = {
  lifecycle: 'static',
  versionStrategy: 'auto',
  enablement: 'restorable',
};

interface TemplateValues extends ManagedWorkflowTemplateValues {
  recipient: string;
  enabled: boolean;
}

type YamlManagedWorkflowDefinition = ManagedWorkflowDefinition & { yaml: string };
type TemplateManagedWorkflowDefinition = ManagedWorkflowDefinition<TemplateValues> & {
  yamlTemplate: (values: TemplateValues) => string;
};

const workflowYaml = ({
  name = 'Managed Workflow',
  enabled = true,
}: {
  name?: string;
  enabled?: boolean;
} = {}) => `name: ${name}
enabled: ${enabled}
triggers: []
steps: []
`;

const definitionHash = (yaml: string): string => {
  return createHash('sha256').update(yaml.trim()).digest('hex');
};

const createDefinition = (
  overrides: {
    id?: string;
    pluginId?: string;
    version?: number;
    yaml?: string;
    management?: Partial<ManagedWorkflowManagement>;
  } = {}
): YamlManagedWorkflowDefinition => ({
  id: overrides.id ?? WORKFLOW_ID,
  pluginId: overrides.pluginId ?? PLUGIN_ID,
  version: overrides.version ?? 1,
  yaml: overrides.yaml ?? workflowYaml(),
  management: {
    ...defaultManagement,
    ...overrides.management,
  },
});

const createTemplateDefinition = (
  overrides: {
    id?: string;
    pluginId?: string;
    management?: Partial<ManagedWorkflowManagement>;
  } = {}
): TemplateManagedWorkflowDefinition => ({
  id: overrides.id ?? WORKFLOW_ID,
  pluginId: overrides.pluginId ?? PLUGIN_ID,
  version: 1,
  yamlTemplate: ({ recipient, enabled }) =>
    workflowYaml({ name: `Managed Workflow - ${recipient}`, enabled }),
  management: {
    ...defaultManagement,
    ...overrides.management,
  },
});

const createWorkflowSource = (overrides: Partial<WorkflowProperties> = {}): WorkflowProperties => ({
  name: 'Managed Workflow',
  description: undefined,
  enabled: true,
  tags: [],
  triggerTypes: [],
  yaml: workflowYaml(),
  definition: { name: 'Managed Workflow', enabled: true } as WorkflowYaml,
  createdBy: 'elastic/kibana',
  lastUpdatedBy: 'elastic/kibana',
  spaceId: SPACE_ID,
  managed: true,
  managedBy: PLUGIN_ID,
  managedVersion: 1,
  definitionHash: 'old-hash',
  managedTemplateValues: null,
  originManagedWorkflowId: WORKFLOW_ID,
  lifecycle: 'static',
  deleted_at: null,
  valid: true,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const createVersionedDocument = (
  source: WorkflowProperties,
  overrides: Partial<VersionedWorkflowDocument> = {}
): VersionedWorkflowDocument => ({
  source,
  seqNo: 7,
  primaryTerm: 13,
  ...overrides,
});

const getYamlEnabled = (yaml: string): boolean => !yaml.includes('enabled: false');

const createCrudServiceMock = () => {
  const crudService = {
    getWorkflowDocumentWithVersion: jest.fn(),
    getWorkflowDocumentSource: jest.fn(),
    getManagedWorkflowDocumentsAllSpaces: jest.fn().mockResolvedValue([]),
    indexWorkflowDocument: jest.fn().mockResolvedValue(undefined),
    deleteWorkflows: jest.fn().mockResolvedValue(undefined),
    prepareWorkflowDocumentForStorage: jest.fn(
      async ({
        id,
        yaml,
        actor,
        now,
        spaceId,
      }: {
        id: string;
        yaml: string;
        actor: string;
        now: Date;
        spaceId: string;
      }) => {
        const enabled = getYamlEnabled(yaml);
        return {
          workflowData: createWorkflowSource({
            name: id,
            enabled,
            yaml,
            definition: { name: id, enabled } as WorkflowYaml,
            createdBy: actor,
            lastUpdatedBy: actor,
            spaceId,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            managed: false,
            managedBy: null,
            managedVersion: null,
            definitionHash: null,
            managedTemplateValues: null,
            originManagedWorkflowId: null,
            lifecycle: null,
          }),
        };
      }
    ),
  };

  return crudService;
};

const createExecutionEngineMock = () =>
  ({
    executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: 'execution-1' }),
  } as unknown as WorkflowsExecutionEnginePluginStart);

const createService = () => {
  const crudService = createCrudServiceMock();
  const workflowsExecutionEngine = createExecutionEngineMock();
  const logger = loggerMock.create();
  const service = new ManagedWorkflowsService({
    crudService: crudService as unknown as WorkflowCrudService,
    workflowsExecutionEngine,
    logger,
  });

  return {
    crudService,
    workflowsExecutionEngine,
    logger,
    service,
  };
};

const getIndexedDocument = (
  crudService: ReturnType<typeof createCrudServiceMock>
): WorkflowProperties => {
  return crudService.indexWorkflowDocument.mock.calls.at(-1)?.[1] as WorkflowProperties;
};

describe('ManagedWorkflowsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockManagedWorkflowDefinitions = [createDefinition()];
  });

  describe('installManagedWorkflow', () => {
    it('creates a new managed workflow document', async () => {
      const definition = createDefinition();
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(null);

      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      expect(crudService.indexWorkflowDocument).toHaveBeenCalledWith(
        WORKFLOW_ID,
        expect.objectContaining({
          managed: true,
          managedBy: PLUGIN_ID,
          originManagedWorkflowId: WORKFLOW_ID,
          lifecycle: 'static',
          managedVersion: 1,
          definitionHash: definitionHash(definition.yaml),
        }),
        { create: true }
      );
    });

    it('preserves the stored enabled state when enablement is restorable', async () => {
      const definition = createDefinition({
        yaml: workflowYaml({ enabled: true }),
        management: { enablement: 'restorable', versionStrategy: 'auto' },
      });
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(
          createWorkflowSource({
            enabled: false,
            yaml: workflowYaml({ enabled: false }),
            definitionHash: 'old-hash',
          })
        )
      );

      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      const indexedDocument = getIndexedDocument(crudService);
      expect(indexedDocument.enabled).toBe(false);
      expect(indexedDocument.definition).toEqual(expect.objectContaining({ enabled: false }));
      expect(indexedDocument.yaml).toContain('enabled: false');
    });

    it('reapplies the definition enabled state when enablement is enforced', async () => {
      const definition = createDefinition({
        yaml: workflowYaml({ enabled: true }),
        management: { enablement: 'enforced', versionStrategy: 'auto' },
      });
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(
          createWorkflowSource({
            enabled: false,
            yaml: workflowYaml({ enabled: false }),
            definitionHash: 'old-hash',
          })
        )
      );

      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      const indexedDocument = getIndexedDocument(crudService);
      expect(indexedDocument.enabled).toBe(true);
      expect(indexedDocument.definition).toEqual(expect.objectContaining({ enabled: true }));
      expect(indexedDocument.yaml).toContain('enabled: true');
    });

    it('skips on_adopt updates during the startup window', async () => {
      const definition = createDefinition({
        management: { versionStrategy: 'on_adopt' },
      });
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(createWorkflowSource({ definitionHash: 'old-hash' }))
      );

      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      expect(crudService.indexWorkflowDocument).not.toHaveBeenCalled();
    });

    it('applies on_adopt updates after the plugin is ready', async () => {
      const definition = createDefinition({
        management: { versionStrategy: 'on_adopt' },
      });
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(createWorkflowSource({ definitionHash: 'old-hash' }))
      );

      await service.pluginReady(definition.pluginId);
      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      expect(crudService.indexWorkflowDocument).toHaveBeenCalledWith(
        WORKFLOW_ID,
        expect.objectContaining({ definitionHash: definitionHash(definition.yaml) }),
        { ifSeqNo: 7, ifPrimaryTerm: 13 }
      );
    });

    it('short-circuits when the definition hash and template values are unchanged', async () => {
      const definition = createTemplateDefinition();
      const templateValues: TemplateValues = { recipient: 'World', enabled: true };
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(
          createWorkflowSource({
            definitionHash: definitionHash(definition.yamlTemplate.toString()),
            managedTemplateValues: templateValues,
          })
        )
      );

      await service.installManagedWorkflow(
        WORKFLOW_ID,
        { spaceId: SPACE_ID, values: templateValues },
        definition.pluginId
      );

      expect(crudService.indexWorkflowDocument).not.toHaveBeenCalled();
    });

    it('re-renders and reindexes when template values change', async () => {
      const definition = createTemplateDefinition();
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(
        createVersionedDocument(
          createWorkflowSource({
            definitionHash: definitionHash(definition.yamlTemplate.toString()),
            managedTemplateValues: { recipient: 'World', enabled: true },
          })
        )
      );

      await service.installManagedWorkflow(
        WORKFLOW_ID,
        { spaceId: SPACE_ID, values: { recipient: 'Elastic', enabled: true } },
        definition.pluginId
      );

      const indexedDocument = getIndexedDocument(crudService);
      expect(indexedDocument.managedTemplateValues).toEqual({
        recipient: 'Elastic',
        enabled: true,
      });
      expect(indexedDocument.yaml).toContain('Managed Workflow - Elastic');
      expect(indexedDocument.enabled).toBe(true);
    });

    it('retries version conflicts and succeeds on a later attempt', async () => {
      const definition = createDefinition();
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, logger, service } = createService();
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(null);
      crudService.indexWorkflowDocument
        .mockRejectedValueOnce({ statusCode: 409 })
        .mockResolvedValueOnce(undefined);

      await service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId);

      expect(crudService.indexWorkflowDocument).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`retrying install for '${WORKFLOW_ID}'`)
      );
    });

    it('throws after exhausting version-conflict retries', async () => {
      const definition = createDefinition();
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, service } = createService();
      const conflictError = { statusCode: 409 };
      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(null);
      crudService.indexWorkflowDocument.mockImplementation(async () => {
        throw conflictError;
      });

      await expect(
        service.installManagedWorkflow(WORKFLOW_ID, { spaceId: SPACE_ID }, definition.pluginId)
      ).rejects.toBe(conflictError);
      expect(crudService.indexWorkflowDocument).toHaveBeenCalledTimes(3);
    });
  });

  describe('pluginReady', () => {
    it('deletes only static managed docs that were not installed during the startup window', async () => {
      const installedDefinition = createDefinition({ id: 'system-installed' });
      const orphanDefinition = createDefinition({ id: 'system-orphan' });
      const dynamicDefinition = createDefinition({
        id: 'system-dynamic',
        management: { lifecycle: 'dynamic' },
      });
      mockManagedWorkflowDefinitions = [installedDefinition, orphanDefinition, dynamicDefinition];
      const { crudService, service } = createService();

      crudService.getWorkflowDocumentWithVersion.mockResolvedValue(null);
      await service.installManagedWorkflow(
        installedDefinition.id as ManagedWorkflowId,
        { spaceId: SPACE_ID },
        PLUGIN_ID
      );
      crudService.indexWorkflowDocument.mockClear();
      crudService.getManagedWorkflowDocumentsAllSpaces.mockResolvedValue([
        {
          id: installedDefinition.id,
          source: createWorkflowSource({
            originManagedWorkflowId: installedDefinition.id,
          }),
        },
        {
          id: orphanDefinition.id,
          source: createWorkflowSource({
            originManagedWorkflowId: orphanDefinition.id,
          }),
        },
        {
          id: dynamicDefinition.id,
          source: createWorkflowSource({
            originManagedWorkflowId: dynamicDefinition.id,
            lifecycle: 'dynamic',
          }),
        },
        {
          id: 'system-other-plugin',
          source: createWorkflowSource({
            managedBy: 'otherPlugin',
            originManagedWorkflowId: orphanDefinition.id,
          }),
        },
      ]);

      await service.pluginReady(PLUGIN_ID);

      expect(crudService.deleteWorkflows).toHaveBeenCalledTimes(1);
      expect(crudService.deleteWorkflows).toHaveBeenCalledWith(['system-orphan'], SPACE_ID, {
        force: true,
      });
    });

    it('is idempotent when called more than once', async () => {
      const definition = createDefinition();
      mockManagedWorkflowDefinitions = [definition];
      const { crudService, logger, service } = createService();

      await service.pluginReady(PLUGIN_ID);
      await service.pluginReady(PLUGIN_ID);

      expect(crudService.getManagedWorkflowDocumentsAllSpaces).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Managed workflows: plugin '${PLUGIN_ID}' called ready() more than once. Ignoring.`
      );
    });
  });

  describe('cleanupUnregisteredOrphans', () => {
    it('deletes managed docs whose owner or definition is no longer registered', async () => {
      const knownDefinition = createDefinition({ id: 'system-known' });
      mockManagedWorkflowDefinitions = [knownDefinition];
      const { crudService, service } = createService();
      crudService.getManagedWorkflowDocumentsAllSpaces.mockResolvedValue([
        {
          id: 'system-known',
          source: createWorkflowSource({
            managedBy: PLUGIN_ID,
            originManagedWorkflowId: knownDefinition.id,
          }),
        },
        {
          id: 'system-unregistered-owner',
          source: createWorkflowSource({
            managedBy: 'removedPlugin',
            originManagedWorkflowId: knownDefinition.id,
          }),
        },
        {
          id: 'system-removed-definition',
          source: createWorkflowSource({
            managedBy: PLUGIN_ID,
            originManagedWorkflowId: 'system-removed',
          }),
        },
        {
          id: 'system-missing-owner',
          source: createWorkflowSource({
            managedBy: null,
            originManagedWorkflowId: knownDefinition.id,
            spaceId: 'other-space',
          }),
        },
        {
          id: 'system-missing-definition',
          source: createWorkflowSource({
            managedBy: PLUGIN_ID,
            originManagedWorkflowId: null,
            spaceId: 'other-space',
          }),
        },
      ]);

      await service.cleanupUnregisteredOrphans([PLUGIN_ID]);

      expect(crudService.getManagedWorkflowDocumentsAllSpaces).toHaveBeenCalledWith({
        includeDeleted: true,
      });
      expect(crudService.deleteWorkflows).toHaveBeenCalledTimes(2);
      expect(crudService.deleteWorkflows).toHaveBeenCalledWith(
        ['system-unregistered-owner', 'system-removed-definition'],
        SPACE_ID,
        { force: true }
      );
      expect(crudService.deleteWorkflows).toHaveBeenCalledWith(
        ['system-missing-owner', 'system-missing-definition'],
        'other-space',
        { force: true }
      );
    });

    it('does not delete managed docs for registered owners with known definitions', async () => {
      const staticDefinition = createDefinition({ id: 'system-static' });
      const dynamicDefinition = createDefinition({
        id: 'system-dynamic',
        management: { lifecycle: 'dynamic' },
      });
      mockManagedWorkflowDefinitions = [staticDefinition, dynamicDefinition];
      const { crudService, service } = createService();
      crudService.getManagedWorkflowDocumentsAllSpaces.mockResolvedValue([
        {
          id: staticDefinition.id,
          source: createWorkflowSource({
            managedBy: PLUGIN_ID,
            originManagedWorkflowId: staticDefinition.id,
          }),
        },
        {
          id: dynamicDefinition.id,
          source: createWorkflowSource({
            managedBy: PLUGIN_ID,
            originManagedWorkflowId: dynamicDefinition.id,
            lifecycle: 'dynamic',
          }),
        },
      ]);

      await service.cleanupUnregisteredOrphans([PLUGIN_ID]);

      expect(crudService.deleteWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('executeManagedWorkflow', () => {
    it('executes a global managed workflow from a tenant space using tenant execution context', async () => {
      const definition = createDefinition();
      const request = {} as KibanaRequest;
      const { crudService, workflowsExecutionEngine, service } = createService();
      mockManagedWorkflowDefinitions = [definition];
      crudService.getWorkflowDocumentSource.mockResolvedValue(
        createWorkflowSource({
          spaceId: '*',
          definition: { name: 'Managed Workflow', enabled: true } as WorkflowYaml,
        })
      );

      const executionId = await service.executeManagedWorkflow(
        WORKFLOW_ID,
        request,
        {
          spaceId: SPACE_ID,
          inputs: { foo: 'bar' },
          triggeredBy: 'test',
          metadata: { source: 'unit-test' },
        },
        definition.pluginId
      );

      expect(executionId).toBe('execution-1');
      expect(crudService.getWorkflowDocumentSource).toHaveBeenCalledWith(WORKFLOW_ID, SPACE_ID, {
        includeGlobal: true,
      });
      expect(workflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
        expect.objectContaining<Partial<WorkflowExecutionEngineModel>>({
          id: WORKFLOW_ID,
          managed: true,
          managedBy: PLUGIN_ID,
          originManagedWorkflowId: WORKFLOW_ID,
        }),
        {
          spaceId: SPACE_ID,
          inputs: { foo: 'bar' },
          triggeredBy: 'test',
          metadata: { source: 'unit-test' },
        },
        request
      );
    });
  });
});
