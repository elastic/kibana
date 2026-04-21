/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates log documents based on the sample log parser.
 */

import type { LogDocument } from '@kbn/synthtrace-client';
import { Serializable } from '@kbn/synthtrace-client';
import type { LoghubTimestampLayout } from '@kbn/sample-log-parser';
import { SampleParserClient } from '@kbn/sample-log-parser';
import type { MetadataOverride } from '@kbn/sample-log-parser';
import type { WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { castArray } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

// ── Realistic messy per-document metadata ─────────────────────────────────────
// Simulates the noise, partial overlap, and inconsistency of real production
// environments: shared hosts, cross-service traces, sparse fields, ambiguous
// tags — while keeping the signal fields (service.name, data_layer, etc.)
// constant per system so the LLM must see through the mess.

type ServiceTheme = 'batch' | 'proxy' | 'mobile' | 'cloud' | 'stream' | 'infra' | 'homog';

function pickRandom<T>(choices: readonly T[] | T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

function randomHex(len: number): string {
  let hex = '';
  for (let i = 0; i < len; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

// ── Host pools with intentional overlap ──────────────────────────────────────
// Some hosts are "shared" across themes (multi-tenant k8s nodes), creating
// ambiguity: seeing host.hostname=dp-worker-03 doesn't tell you which service
// owns the log. Each theme also has dedicated hosts that lean towards it.

const SHARED_HOSTS = ['dp-worker-01', 'dp-worker-02', 'dp-worker-03', 'dp-worker-04'];

const DEDICATED_HOSTS: Record<ServiceTheme, string[]> = {
  batch: ['dp-batch-01', 'dp-batch-02'],
  proxy: ['proxy-edge-01', 'proxy-edge-02'],
  mobile: ['mobile-gw-01', 'mobile-gw-02'],
  cloud: ['nova-compute-01', 'nova-compute-02'],
  stream: ['dp-stream-01', 'dp-stream-02'],
  infra: ['infra-mon-01', 'infra-mon-02'],
  homog: ['syslog-01', 'syslog-02'],
};

// ── Cross-service trace IDs (distributed traces) ────────────────────────────
// A small pool of trace IDs is shared across ALL themes. When a doc picks one
// of these, it simulates a request that hops between services, making trace.id
// useless as a discriminator.

const CROSS_SERVICE_TRACES = Array.from({ length: 8 }, () => randomHex(32));

// ── Sparse / inconsistent fields ─────────────────────────────────────────────
// Real environments have missing fields: some hosts don't report container.id,
// some logs lack a deployment version, etc.

const DEPLOYMENT_VERSIONS = ['v2.1.0', 'v2.1.1', 'v2.2.0', 'v2.3.0-rc1'] as const;

// A few container IDs that appear in multiple themes (pods rescheduled)
const SHARED_CONTAINER_IDS = Array.from({ length: 4 }, () => randomHex(12));

function buildPerDocMetadata(theme: ServiceTheme): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  // ── host.hostname: ~60% dedicated, ~40% shared (ambiguous) ──
  if (Math.random() < 0.6) {
    metadata['host.hostname'] = pickRandom(DEDICATED_HOSTS[theme]);
  } else {
    metadata['host.hostname'] = pickRandom(SHARED_HOSTS);
  }

  // ── process.pid: always present ──
  metadata['process.pid'] = Math.floor(Math.random() * 60000) + 1000;

  // ── trace.id: ~15% cross-service (shared), ~85% unique ──
  if (Math.random() < 0.15) {
    metadata['trace.id'] = pickRandom(CROSS_SERVICE_TRACES);
  } else {
    metadata['trace.id'] = randomHex(32);
  }

  // ── container.id: ~70% present; of those, ~20% are shared containers ──
  if (Math.random() < 0.7) {
    if (Math.random() < 0.2) {
      metadata['container.id'] = pickRandom(SHARED_CONTAINER_IDS);
    } else {
      metadata['container.id'] = randomHex(12);
    }
  }

  // ── cloud.availability_zone: always present, shared across themes ──
  metadata['cloud.availability_zone'] = pickRandom(['us-east-1a', 'us-east-1b', 'us-east-1c']);

  // ── deployment.version: ~60% present, shared across themes ──
  if (Math.random() < 0.6) {
    metadata['deployment.version'] = pickRandom(DEPLOYMENT_VERSIONS);
  }

  // ── environment: universal tag — completely useless for partitioning ──
  metadata['environment'] = 'production';

  return metadata;
}

/**
 * Wrap a base metadata override with per-document realistic noise.
 * Signal fields (service.name, host.name, data_layer, etc.) stay constant;
* noise fields vary per document with intentional overlap and sparsity.
 */
function withPerDocMetadata(
  base: Record<string, unknown>,
  system: string,
  theme: ServiceTheme
): MetadataOverride {
  return (_docIndex: number, _logLine: string) => ({
    ...base,
    ...buildPerDocMetadata(theme),
  });
}

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const { logger } = runOptions;
  const client = new SampleParserClient({ logger });

  const {
    rpm,
    streamType,
    systems,
    isLogsEnabled,
    skipFork,
    loghubTimestampLayout,
    loghubMetadataOverrides: metadataOverridesInput,
  } = (runOptions.scenarioOpts ?? {}) as {
    rpm?: number;
    systems?: string | string[];
    streamType?: 'classic' | 'wired';
    skipFork?: boolean;
    isLogsEnabled?: boolean;
    loghubTimestampLayout?: LoghubTimestampLayout;
    loghubMetadataOverrides?: string | Record<string, Record<string, unknown>>;
    /** JSON map of system name → service theme for per-document dynamic metadata. */
    loghubCreativeThemes?: string | Record<string, ServiceTheme>;
  };

  // Parse JSON string metadata overrides if provided
  let loghubMetadataOverrides: Record<string, Record<string, unknown>> | undefined;
  if (metadataOverridesInput) {
    loghubMetadataOverrides =
      typeof metadataOverridesInput === 'string'
        ? JSON.parse(metadataOverridesInput)
        : metadataOverridesInput;
  }

  // Parse creative themes and convert static overrides into per-document generators
  const creativeThemesInput = (runOptions.scenarioOpts ?? {})['loghubCreativeThemes'] as
    | string
    | Record<string, ServiceTheme>
    | undefined;
  let creativeThemes: Record<string, ServiceTheme> | undefined;
  if (creativeThemesInput) {
    creativeThemes =
      typeof creativeThemesInput === 'string'
        ? JSON.parse(creativeThemesInput)
        : creativeThemesInput;
  }

  let resolvedOverrides: Record<string, MetadataOverride> | undefined;
  if (loghubMetadataOverrides) {
    resolvedOverrides = {};
    for (const [systemName, baseOverride] of Object.entries(loghubMetadataOverrides)) {
      const theme = creativeThemes?.[systemName];
      if (theme) {
        resolvedOverrides[systemName] = withPerDocMetadata(baseOverride, systemName, theme);
      } else {
        resolvedOverrides[systemName] = baseOverride;
      }
    }
  }

  const generators = await client.getLogGenerators({
    rpm,
    streamType: streamType === 'classic' ? 'classic' : 'wired',
    systems: {
      loghub: castArray(systems ?? []).flatMap((item) => item.split(',')),
    },
    loghubTimestampLayout,
    loghubMetadataOverrides: resolvedOverrides,
  });

  return {
    bootstrap: async ({ streamsClient }) => {
      await streamsClient.enable();

      if (skipFork) {
        return;
      }

      const setupChildStreams = async (rootStream: string) => {
        const isEcsStream = rootStream === 'logs.ecs';
        // OTel streams use 'attributes.' prefix, ECS streams don't
        const prefix = isEcsStream ? '' : 'attributes.';
        const customPrefix = 'attributes.';

        // Setting linux child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.linux` },
            where: { field: `${prefix}filepath`, eq: 'Linux.log' },
          },
          { ignore: [409] }
        );

        // Setting windows child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.windows` },
            where: { field: `${prefix}filepath`, eq: 'Windows.log' },
          },
          { ignore: [409] }
        );

        // Setting android child stream
        await streamsClient.forkStream(
          rootStream,
          {
            stream: { name: `${rootStream}.android` },
            where: { field: `${prefix}filepath`, eq: 'Android.log' },
          },
          {
            ignore: [409],
          }
        );

        await streamsClient.enableFailureStore(`${rootStream}.android`);

        // For ECS streams, don't define custom wired fields - rely on dynamic mapping
        // For OTel streams, define the fields with attributes namespace
        const wiredFields = isEcsStream
          ? { fields: {}, routing: [] }
          : {
              fields: {
                [`${prefix}process.name`]: { type: 'keyword', ignore_above: 18 },
                [`${customPrefix}secure`]: { type: 'boolean' },
              },
              routing: [],
            };

        await streamsClient.putIngestStream(`${rootStream}.android`, {
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                // Set up some failed documents
                {
                  condition: {
                    field: `${prefix}user.name`,
                    eq: 'user1',
                    steps: [
                      {
                        action: 'date',
                        where: {
                          always: {},
                        },
                        from: `${prefix}user.name`,
                        formats: ['UNIX_MS'],
                        ignore_failure: false,
                        customIdentifier: 'icd139630-bfc9-11f0-be91-458063de4bb2',
                      },
                    ],
                  },
                  customIdentifier: 'ic6001030-bfc9-11f0-be91-458063de4bb2',
                },
                // Set up some documents with boolean `false` value
                {
                  action: 'set',
                  where: {
                    always: {},
                  },
                  to: `${customPrefix}secure`,
                  value: 'false',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'i89cd8e40-c072-11f0-b0d2-fb65f5013a7f',
                },
                // Set up some documents with boolean `true` value
                {
                  action: 'set',
                  where: {
                    field: `${prefix}user.name`,
                    eq: 'user3',
                  },
                  to: `${customPrefix}secure`,
                  value: 'true',
                  override: true,
                  ignore_failure: false,
                  customIdentifier: 'icedf22a0-c072-11f0-b0d2-fb65f5013a7f',
                },
              ],
            },
            wired: wiredFields,
            failure_store: { inherit: {} },
          } as WiredIngestUpsertRequest,
        });
      };

      try {
        // Set up legacy logs stream if enabled
        if (isLogsEnabled) {
          logger.info('Setting up legacy logs and child streams');
          await setupChildStreams('logs');
        }

        logger.info('Setting up logs.otel and child streams');
        await setupChildStreams('logs.otel');

        logger.info('Setting up logs.ecs and child streams');
        await setupChildStreams('logs.ecs');
      } catch (error) {
        const wrapped = new Error('Error occurred while forking streams', { cause: error });
        logger.error(wrapped);
        throw wrapped;
      }
    },
    generate: ({ range, clients: { streamsClient } }) => {
      return withClient(
        streamsClient,
        range.interval('5s').generator((timestamp) => {
          return generators.flatMap((generator) =>
            generator.next(timestamp).map((doc) => new Serializable(doc))
          );
        })
      );
    },
  };
};

export default scenario;
