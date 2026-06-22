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
  'kibana.alert.rule.name': SECURITY_TEST_DATA.ALERT_RULE_NAME,
  'kibana.alert.rule.uuid': 'security-discover-rule-1',
  'kibana.alert.rule.rule_id': 'security-discover-rule-1',
  'kibana.alert.rule.description': 'Synthetic rule used by the Security-in-Discover Scout tests.',
  'kibana.alert.rule.category': 'Custom Query Rule',
  'kibana.alert.severity': 'high',
  'kibana.alert.risk_score': 73,
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.reason': `network event with source ${SECURITY_TEST_DATA.SOURCE_IP} created high alert ${SECURITY_TEST_DATA.ALERT_RULE_NAME}.`,
  'kibana.alert.original_time': DOC_TIMESTAMP,
  'host.name': SECURITY_TEST_DATA.HOST_NAME,
  'user.name': SECURITY_TEST_DATA.USER_NAME,
  'source.ip': SECURITY_TEST_DATA.SOURCE_IP,
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
  'host.name': SECURITY_TEST_DATA.HOST_NAME,
  'user.name': SECURITY_TEST_DATA.USER_NAME,
  'source.ip': SECURITY_TEST_DATA.SOURCE_IP,
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
  'threat.indicator.name': SECURITY_TEST_DATA.IOC_NAME,
  'threat.indicator.url.domain': SECURITY_TEST_DATA.IOC_NAME,
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
  // nested objects the profile's field accessors (`getFieldValue`) read.
  await esClient.indices.create({
    index,
    mappings: { dynamic: true },
  });

  const operations = documents.flatMap((doc) => [{ index: { _index: index } }, doc]);
  await esClient.bulk({ operations, refresh: true });
};

/**
 * Create the synthetic security indices (alerts, events, IOCs) used by the Security-in-Discover
 * tests, skipping any that already exist. Returns true if at least one index was created.
 */
export async function createSecurityTestIndicesIfNeeded(esClient: EsClient): Promise<boolean> {
  let createdAny = false;

  for (const { index, documents } of INDICES) {
    const exists = await esClient.indices.exists({ index });
    if (exists) {
      continue;
    }

    try {
      await createIndexWithDocuments(esClient, index, documents);
      createdAny = true;
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

  return createdAny;
}
