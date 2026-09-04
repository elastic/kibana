/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Entity Store scale / performance test scenario.
 *
 * Emits synthetic log documents that feed the entity store extraction engines.
 * Each document carries exactly one entity type's identity fields, routing to
 * `logs-perf.entity-default` which is matched by the default `logs-*` source
 * pattern — no additionalIndexPatterns needed.
 *
 * Usage (against a Cloud cluster):
 *
 *   node scripts/synthtrace entity_store_scale \
 *     --target=https://elastic:<pwd>@<es-endpoint> \
 *     --live \
 *     --scenarioOpts="entityTypes=89,cardinality=2000,docsPerMinutePerType=20000,uniqueFields=2,seed=42" \
 *     --workers=4 --concurrency=8 --liveBucketSize=1000
 *
 * Tunable options (via --scenarioOpts):
 *   entityTypes         — number of perf entity types to feed (1..89). Default 89.
 *   cardinality         — distinct entity ids per type. Default 2000.
 *                         Use 15000+ to exercise multi-page entity extraction (docsLimit=10000).
 *   docsPerMinutePerType— raw log documents emitted per type per minute. Default 20000.
 *   uniqueFields        — extra attr_K fields stamped per document (beyond id/name). Default 2.
 *   seed                — RNG seed for reproducibility. Default 42.
 *
 * Ramp tiers (install engines before starting the scenario):
 *   T0:  baseline (existing 11 engines), entityTypes=0
 *   T1:  25 total → entityTypes=14
 *   T2:  50 total → entityTypes=39
 *   T3: 100 total → entityTypes=89
 *   T4: 200 total → install T3 into a second Kibana space
 */

import { Serializable } from '@kbn/synthtrace-client';
import type { LogDocument } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { mulberry32 } from '../lib/service_graph_logs/placeholders';

const DEFAULT_OPTS = {
  entityTypes: 89,
  cardinality: 2000,
  docsPerMinutePerType: 20_000,
  uniqueFields: 2,
  seed: 42,
};

const pad = (n: number) => String(n).padStart(3, '0');

// Field names use underscores (matching perf_synthetic.ts definitions) because ES|QL
// identifiers cannot start with a digit — `perf.entity.001.id` would fail parsing.
const fieldId = (tag: string) => `perf_entity_${tag}_id`;
const fieldName = (tag: string) => `perf_entity_${tag}_name`;
const fieldAltId = (tag: string) => `perf_entity_${tag}_id_alt`;
const fieldAttr = (tag: string, k: number) => `perf_entity_${tag}_attr_${k}`;

/** Build one log document for entity type n (1-based) and entity index idx (0-based). */
const buildDoc = (n: number, idx: number, uniqueFields: number, timestamp: number): LogDocument => {
  const tag = pad(n);
  const entityId = `perf-${tag}-${idx}`;
  const fields: Record<string, unknown> = {
    // Data stream routing — matches `logs-perf.entity-default` via `logs-*`.
    'data_stream.type': 'logs',
    'data_stream.dataset': 'perf.entity',
    'data_stream.namespace': 'default',
    'event.dataset': 'perf.entity',
    'event.module': 'entity_store_perf',
    '@timestamp': new Date(timestamp).toISOString(),
    // Required by the LogsSynthtraceEsClient routing transform.
    'input.type': 'logs',
    // Entity identity and name fields (underscored names avoid numeric-starting ES|QL segments).
    [fieldId(tag)]: entityId,
    [fieldName(tag)]: `entity-${tag}-${idx}`,
  };

  // Every 10th type has a secondary id field (composite-identity branch in the definition).
  if (n % 10 === 0) {
    fields[fieldAltId(tag)] = `${entityId}-alt`;
  }

  // Extra attribute fields — exercises collectValues mapping paths.
  for (let k = 0; k < uniqueFields; k++) {
    fields[fieldAttr(tag, k)] = `val-${idx}-${k}`;
  }

  return fields as LogDocument;
};

const scenario: Scenario<LogDocument> = async (runOptions) => {
  const opts = { ...DEFAULT_OPTS, ...(runOptions.scenarioOpts ?? {}) };
  const entityTypeCount = Math.max(0, Math.min(89, Number(opts.entityTypes)));
  const cardinality = Math.max(1, Number(opts.cardinality));
  const docsPerMinutePerType = Math.max(1, Number(opts.docsPerMinutePerType));
  const uniqueFields = Math.max(0, Math.min(6, Number(opts.uniqueFields)));
  const seed = Number(opts.seed);

  runOptions.logger.info(
    `entity_store_scale: entityTypes=${entityTypeCount} cardinality=${cardinality} ` +
      `docsPerMinutePerType=${docsPerMinutePerType} uniqueFields=${uniqueFields} seed=${seed}`
  );

  if (entityTypeCount === 0) {
    runOptions.logger.info(
      'entityTypes=0 — no perf docs will be emitted. ' +
        'Use the existing 11 base engines with their own data sources for T0 baseline.'
    );
  }

  return {
    generate: ({ range, clients: { logsEsClient } }) => {
      // One seeded RNG per type to keep entity distributions independent across types.
      const rngs = Array.from({ length: entityTypeCount }, (_, i) => mulberry32(seed + i * 1000));

      const generators = Array.from({ length: entityTypeCount }, (_, i) => {
        const n = i + 1; // 1-based type index
        const rng = rngs[i];

        return range
          .interval('1m')
          .rate(docsPerMinutePerType)
          .generator((timestamp) => {
            // Pick a random entity id within this type's cardinality.
            const idx = Math.floor(rng() * cardinality);
            return new Serializable(buildDoc(n, idx, uniqueFields, timestamp));
          });
      });

      return withClient(logsEsClient, generators);
    },
  };
};

// eslint-disable-next-line import/no-default-export
export default scenario;
