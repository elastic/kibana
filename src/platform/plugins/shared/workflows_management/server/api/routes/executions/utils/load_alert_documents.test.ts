/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { AlertDocumentsTooLargeError } from './alert_documents_too_large_error';
import type { AlertRuleTypes } from './load_alert_documents';
import { loadAlertDocuments, MAX_LOAD_ALERT_IDS } from './load_alert_documents';
import { WorkflowTriggerInputError } from '../../../workflow_trigger_input_error';

const INDEX = '.alerts-security.alerts-default';

const searchResponse = (
  hits: Array<{ _id: string; _source: Record<string, unknown> }>
): estypes.SearchResponse<Record<string, unknown>> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: hits.map((hit) => ({ _index: `${INDEX}-000001`, ...hit })) },
});

describe('loadAlertDocuments', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;
  let formatAlert: jest.Mock;
  let ruleTypes: AlertRuleTypes;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    formatAlert = jest.fn((alert: Record<string, unknown>) => ({ ...alert, signal: { ok: true } }));
    ruleTypes = new Map([
      [QUERY_RULE_TYPE_ID, { alerts: { formatAlert } }],
    ]) as unknown as AlertRuleTypes;
  });

  describe('by selections', () => {
    it('fetches the selected pairs with one mget and returns formatted, expanded documents', async () => {
      esClient.mget.mockResponse({
        docs: [
          {
            _id: 'a1',
            _index: INDEX,
            found: true,
            _source: { 'kibana.alert.uuid': 'a1', 'host.name': 'h1' },
          },
          { _id: 'a2', _index: INDEX, found: false },
        ],
      });

      const result = await loadAlertDocuments({
        alerts: {
          selections: [
            { _id: 'a1', _index: INDEX },
            { _id: 'a2', _index: INDEX },
          ],
        },
        esClient,
        ruleTypes,
        logger,
      });

      expect(esClient.mget).toHaveBeenCalledWith({
        docs: [
          { _id: 'a1', _index: INDEX },
          { _id: 'a2', _index: INDEX },
        ],
      });
      expect(formatAlert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        alerts: [
          {
            _id: 'a1',
            _index: INDEX,
            kibana: { alert: { uuid: 'a1' } },
            host: { name: 'h1' },
            signal: { ok: true },
          },
        ],
        missingIds: ['a2'],
      });
    });

    it('adds the fields formatAlert depends on to the requested source includes', async () => {
      esClient.mget.mockResponse({ docs: [] });

      await loadAlertDocuments({
        alerts: { selections: [{ _id: 'a1', _index: INDEX }] },
        sourceIncludes: ['host.name'],
        esClient,
        ruleTypes,
        logger,
      });

      expect(esClient.mget).toHaveBeenCalledWith(
        expect.objectContaining({
          _source_includes: ['host.name', 'kibana.alert.rule.rule_type_id', 'kibana.alert.uuid'],
        })
      );
    });
  });

  describe('by ids within an index', () => {
    it('searches the index by ids in chunks and reports ids that matched nothing', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
      esClient.search
        .mockResponseOnce(
          searchResponse(ids.slice(0, 100).map((_id) => ({ _id, _source: { 'event.kind': 'x' } })))
        )
        .mockResponseOnce(searchResponse([{ _id: 'id-100', _source: { 'event.kind': 'x' } }]));

      const result = await loadAlertDocuments({
        alerts: { ids, index: INDEX },
        sourceIncludes: ['event.kind'],
        esClient,
        ruleTypes,
        logger,
      });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.search).toHaveBeenNthCalledWith(1, {
        index: INDEX,
        ignore_unavailable: true,
        size: 100,
        query: { ids: { values: ids.slice(0, 100) } },
        _source: {
          includes: ['event.kind', 'kibana.alert.rule.rule_type_id', 'kibana.alert.uuid'],
        },
      });
      expect(result.alerts).toHaveLength(101);
      expect(result.alerts[0]).toEqual(
        expect.objectContaining({ _id: 'id-0', _index: `${INDEX}-000001` })
      );
      expect(result.missingIds).toEqual(ids.slice(101));
    });

    it('rejects more ids than the load limit before querying', async () => {
      const ids = Array.from({ length: MAX_LOAD_ALERT_IDS + 1 }, (_, i) => `id-${i}`);

      await expect(
        loadAlertDocuments({ alerts: { ids, index: INDEX }, esClient, ruleTypes, logger })
      ).rejects.toThrow(WorkflowTriggerInputError);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  it('keeps sibling fields when a document mixes dotted and nested forms of the same object', async () => {
    esClient.search.mockResponseOnce(
      searchResponse([
        {
          _id: 'a1',
          _source: { 'kibana.alert.rule.name': 'My rule', kibana: { alert: { uuid: 'a1' } } },
        },
      ])
    );

    const { alerts } = await loadAlertDocuments({
      alerts: { ids: ['a1'], index: INDEX },
      esClient,
      ruleTypes: new Map() as AlertRuleTypes,
      logger,
    });

    expect(alerts[0].kibana).toEqual({ alert: { uuid: 'a1', rule: { name: 'My rule' } } });
  });

  it('uses the rule type of the document to format it', async () => {
    const otherFormatAlert = jest.fn((alert: Record<string, unknown>) => alert);
    ruleTypes = new Map([
      [QUERY_RULE_TYPE_ID, { alerts: { formatAlert } }],
      ['other.rule', { alerts: { formatAlert: otherFormatAlert } }],
    ]) as unknown as AlertRuleTypes;
    esClient.search.mockResponseOnce(
      searchResponse([{ _id: 'a1', _source: { 'kibana.alert.rule.rule_type_id': 'other.rule' } }])
    );

    await loadAlertDocuments({
      alerts: { ids: ['a1'], index: INDEX },
      esClient,
      ruleTypes,
      logger,
    });

    expect(otherFormatAlert).toHaveBeenCalledTimes(1);
    expect(formatAlert).not.toHaveBeenCalled();
  });

  it('throws AlertDocumentsTooLargeError when the documents exceed maxBytes', async () => {
    esClient.search.mockResponseOnce(
      searchResponse([{ _id: 'a1', _source: { message: 'x'.repeat(200) } }])
    );

    const load = loadAlertDocuments({
      alerts: { ids: ['a1'], index: INDEX },
      maxBytes: 100,
      esClient,
      ruleTypes,
      logger,
    });

    await expect(load).rejects.toBeInstanceOf(AlertDocumentsTooLargeError);
    await expect(load).rejects.toMatchObject({ limitBytes: 100 });
  });
});
