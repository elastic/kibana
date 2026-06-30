/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsClient } from '@kbn/scout';
import { errors } from '@elastic/elasticsearch';
import { SECURITY_INDICES, SECURITY_TEST_DATA } from '../constants';

/**
 * Fixed timestamp for every synthetic document. Kept inside `SECURITY_TIME_RANGE` so the default
 * Discover time picker shows the documents. A constant (not `Date.now()`) keeps runs deterministic.
 */
const DOC_TIMESTAMP = '2025-06-01T12:00:00.000Z';

// Field values only used to build the synthetic documents. `HOST_NAME` is shared with the specs
// (they hover/filter on it), so it lives in SECURITY_TEST_DATA.
const { HOST_NAME } = SECURITY_TEST_DATA;
const ALERT_RULE_NAME = 'Security Discover test rule';
const USER_NAME = 'discover-test-user';
const SOURCE_IP = '10.0.0.1';
const IOC_NAME = 'malicious.example.com';

/**
 * Minimal alert document: the Security profile treats `event.kind: 'signal'` as an alert and the
 * flyout header / overview tab read the `kibana.alert.*`, host, user and ip fields below.
 */
const alertDocument = () => ({
  '@timestamp': DOC_TIMESTAMP,
  'event.kind': 'signal',
  'event.category': ['network'],
  'event.type': ['connection'],
  'kibana.alert.uuid': 'security-discover-alert-1',
  'kibana.alert.rule.name': ALERT_RULE_NAME,
  'kibana.alert.rule.uuid': 'security-discover-rule-1',
  'kibana.alert.rule.rule_id': 'security-discover-rule-1',
  'kibana.alert.rule.description': 'Synthetic rule used by the Security-in-Discover Scout tests.',
  'kibana.alert.rule.category': 'Custom Query Rule',
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 73,
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.reason': `network event with source ${SOURCE_IP} created high alert ${ALERT_RULE_NAME}.`,
  'kibana.alert.original_time': DOC_TIMESTAMP,
  'host.name': HOST_NAME,
  'user.name': USER_NAME,
  'source.ip': SOURCE_IP,
  'destination.ip': '10.0.0.2',
  message: 'Synthetic security alert document for Discover flyout tests',
});

/** Minimal raw event document (`event.kind` present and not `signal`). */
const eventDocument = () => ({
  '@timestamp': DOC_TIMESTAMP,
  'event.kind': 'event',
  'event.category': ['process'],
  'event.type': ['start'],
  'event.action': 'process-started',
  'host.name': HOST_NAME,
  'user.name': USER_NAME,
  'source.ip': SOURCE_IP,
  'process.name': 'discover-test-process',
  message: 'Synthetic security event document for Discover flyout tests',
});

/** Minimal threat-intelligence indicator document (`event.type` includes `indicator`). */
const iocDocument = () => ({
  '@timestamp': DOC_TIMESTAMP,
  'event.kind': 'enrichment',
  'event.category': ['threat'],
  'event.type': ['indicator'],
  'event.dataset': 'ti_abusech.malware',
  'threat.feed.name': 'AbuseCH Malware',
  'threat.indicator.type': 'domain-name',
  'threat.indicator.name': IOC_NAME,
  'threat.indicator.url.domain': IOC_NAME,
  'threat.indicator.marking.tlp': 'WHITE',
  message: 'Synthetic threat intelligence indicator document for Discover flyout tests',
});

const INDICES: ReadonlyArray<{ index: string; documents: Array<Record<string, unknown>> }> = [
  { index: SECURITY_INDICES.ALERTS, documents: [alertDocument()] },
  { index: SECURITY_INDICES.EVENTS, documents: [eventDocument()] },
  { index: SECURITY_INDICES.IOCS, documents: [iocDocument()] },
];

const createIndexWithDocuments = async (
  esClient: EsClient,
  index: string,
  documents: Array<Record<string, unknown>>
) => {
  // `event.*`, `kibana.alert.*` etc. arrive as dotted keys; dynamic mapping expands them into the
  // nested objects the profile's field accessors (`getFieldValue`) read. The IP fields are mapped
  // explicitly because the security profile's IP cell renderer only registers for fields the data
  // view reports as `ip`-typed — dynamic mapping would infer `text`/`keyword` from the string value.
  await esClient.indices.create({
    index,
    mappings: {
      dynamic: true,
      properties: {
        source: { properties: { ip: { type: 'ip' } } },
        destination: { properties: { ip: { type: 'ip' } } },
      },
    },
  });

  const operations = documents.flatMap((doc) => [{ index: { _index: index } }, doc]);
  await esClient.bulk({ operations, refresh: true });
};

/**
 * Create the synthetic security indices (alerts, events, IOCs) used by the Security-in-Discover
 * tests. Any pre-existing index is dropped and recreated so mapping changes (e.g. the explicit `ip`
 * mapping the IP cell renderer depends on) always take effect, even on a persistent local ES that
 * still holds an index from an earlier run.
 */
export async function createSecurityTestIndices(esClient: EsClient): Promise<void> {
  for (const { index, documents } of INDICES) {
    if (await esClient.indices.exists({ index })) {
      await esClient.indices.delete({ index });
    }

    try {
      await createIndexWithDocuments(esClient, index, documents);
    } catch (error) {
      if (
        error instanceof errors.ResponseError &&
        error.body?.error?.type === 'resource_already_exists_exception'
      ) {
        continue;
      }
      throw error;
    }
  }
}
