/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type { AlertingServerStart } from '@kbn/alerting-plugin/server';
import { expandFlattenedAlert } from '@kbn/alerting-plugin/server/alerts_client/lib';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_RULE_TYPE_ID, ALERT_UUID } from '@kbn/rule-data-utils';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { AlertDocumentsTooLargeError } from './alert_documents_too_large_error';
import { TooManyAlertDocumentsError } from './too_many_alert_documents_error';
import type { DocumentSelection } from '../../../common/types/document_types';
import type { FetchedSource } from '../routes/executions/utils/fetch_by_ids';
import { fetchAlertSourcesByIds } from '../routes/executions/utils/fetch_by_ids';

/** Most alerts one `loadAlertDocuments` call loads, in either lookup mode. */
export const MAX_LOAD_ALERT_DOCUMENTS = 1000;

const SEARCH_CHUNK_SIZE = 100;

/** Fields `formatAlert` needs to pick the rule type and recognise the document as an alert. */
const FORMAT_ALERT_FIELDS = [ALERT_RULE_TYPE_ID, ALERT_UUID] as const;

export type AlertRuleTypes = ReturnType<AlertingServerStart['listTypes']>;

/**
 * Which alerts to load: concrete `{ _id, _index }` pairs (one `mget`), or ids resolved within an
 * index pattern or alias such as `.alerts-security.alerts-<space>` (chunked `ids` searches).
 */
export type AlertDocumentsLookup =
  | { selections: readonly DocumentSelection[] }
  | { ids: readonly string[]; index: string };

export interface LoadAlertDocumentsRequest {
  alerts: AlertDocumentsLookup;
  /**
   * `_source` include patterns. Omit to load whole documents. `kibana.alert.uuid` and
   * `kibana.alert.rule.rule_type_id` are always loaded so formatting matches whole-document loads.
   */
  sourceIncludes?: readonly string[];
  /** Fail with `AlertDocumentsTooLargeError` once the loaded documents exceed this many bytes. */
  maxBytes?: number;
}

export type LoadedAlertDocument = DocumentSelection & Record<string, unknown>;

export interface LoadedAlertDocuments {
  alerts: LoadedAlertDocument[];
  /** Requested ids that matched no document. */
  missingIds: string[];
}

export interface LoadAlertDocumentsParams extends LoadAlertDocumentsRequest {
  /** Must be scoped to the requesting user so reads respect their index privileges. */
  esClient: ElasticsearchClient;
  ruleTypes: AlertRuleTypes;
  logger: Logger;
}

const withFormatFields = (
  sourceIncludes: readonly string[] | undefined
): readonly string[] | undefined =>
  sourceIncludes ? Array.from(new Set([...sourceIncludes, ...FORMAT_ALERT_FIELDS])) : undefined;

const assertWithinLoadLimit = (requestedCount: number): void => {
  if (requestedCount > MAX_LOAD_ALERT_DOCUMENTS) {
    throw new TooManyAlertDocumentsError(MAX_LOAD_ALERT_DOCUMENTS, requestedCount);
  }
};

const searchAlertSourcesByIds = async ({
  ids,
  index,
  esClient,
  sourceIncludes,
}: {
  ids: readonly string[];
  index: string;
  esClient: ElasticsearchClient;
  sourceIncludes?: readonly string[];
}): Promise<FetchedSource[]> => {
  const response = await esClient.search<Record<string, unknown>>({
    index,
    ignore_unavailable: true,
    size: ids.length,
    query: { ids: { values: [...ids] } },
    ...(sourceIncludes ? { _source: { includes: [...sourceIncludes] } } : {}),
  });
  const documents: FetchedSource[] = [];
  for (const { _id, _index, _source } of response.hits.hits) {
    if (_id && _source) {
      documents.push({ _id, _index, _source });
    }
  }
  return documents;
};

const formatAndExpand = (
  { _id, _index, _source }: FetchedSource,
  ruleTypes: AlertRuleTypes
): LoadedAlertDocument => {
  let alert = _source as Alert;
  const ruleTypeId = get(alert, ALERT_RULE_TYPE_ID) as string | undefined;
  const formatAlert = ruleTypes.get(ruleTypeId || QUERY_RULE_TYPE_ID)?.alerts?.formatAlert;
  if (formatAlert) {
    alert = formatAlert(alert) as Alert;
  }
  return { _id, _index, ...(expandFlattenedAlert(alert) as Record<string, unknown>) };
};

/** Returns a check that adds documents to a running byte total and throws once it exceeds `maxBytes`. */
const createByteBudget = (
  maxBytes: number | undefined
): ((alerts: readonly LoadedAlertDocument[]) => void) => {
  let loadedBytes = 0;
  return (alerts) => {
    if (maxBytes === undefined) {
      return;
    }
    for (const alert of alerts) {
      loadedBytes += Buffer.byteLength(JSON.stringify(alert), 'utf8');
      if (loadedBytes > maxBytes) {
        throw new AlertDocumentsTooLargeError(maxBytes, loadedBytes);
      }
    }
  };
};

/**
 * Loads alert documents in the shape workflows consume: the rule type's `formatAlert` is applied,
 * then flattened keys are merged into nested objects.
 */
export const loadAlertDocuments = async ({
  alerts: lookup,
  sourceIncludes,
  maxBytes,
  esClient,
  ruleTypes,
  logger,
}: LoadAlertDocumentsParams): Promise<LoadedAlertDocuments> => {
  const includes = withFormatFields(sourceIncludes);
  const chargeByteBudget = createByteBudget(maxBytes);
  const loaded: LoadedAlertDocument[] = [];
  const addDocuments = (documents: readonly FetchedSource[]): void => {
    const formatted = documents.map((document) => formatAndExpand(document, ruleTypes));
    chargeByteBudget(formatted);
    loaded.push(...formatted);
  };

  let requestedIds: readonly string[];
  if ('selections' in lookup) {
    assertWithinLoadLimit(lookup.selections.length);
    requestedIds = lookup.selections.map(({ _id }) => _id);
    addDocuments(
      await fetchAlertSourcesByIds({
        selections: [...lookup.selections],
        esClient,
        logger,
        sourceIncludes: includes,
      })
    );
  } else {
    requestedIds = Array.from(new Set(lookup.ids));
    assertWithinLoadLimit(requestedIds.length);
    for (let start = 0; start < requestedIds.length; start += SEARCH_CHUNK_SIZE) {
      addDocuments(
        await searchAlertSourcesByIds({
          ids: requestedIds.slice(start, start + SEARCH_CHUNK_SIZE),
          index: lookup.index,
          esClient,
          sourceIncludes: includes,
        })
      );
    }
  }

  const foundIds = new Set(loaded.map(({ _id }) => _id));
  const missingIds = Array.from(new Set(requestedIds.filter((id) => !foundIds.has(id))));

  return { alerts: loaded, missingIds };
};
