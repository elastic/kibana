/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import { preprocessDocumentInputs } from './preprocess_document_inputs';
import type { AlertPreprocessingContext } from '../../../workflows_management_api';

describe('preprocessDocumentInputs', () => {
  let mockEsClient: { mget: jest.Mock };
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockContext: AlertPreprocessingContext;

  const documentIds = [
    { _id: 'doc-1', _index: 'logs-default' },
    { _id: 'doc-2', _index: 'logs-default' },
  ];

  beforeEach(() => {
    mockEsClient = { mget: jest.fn() };
    mockLogger = loggerMock.create();
    mockContext = {
      core: Promise.resolve({
        elasticsearch: { client: { asCurrentUser: mockEsClient } },
      }),
    } as unknown as AlertPreprocessingContext;
  });

  describe('when the selection does not need expanding', () => {
    it.each([
      ['a non-document trigger', { event: { triggerType: 'alert', alertIds: [] } }],
      ['a missing event', { otherField: 'value' }],
      ['an empty documentIds array', { event: { triggerType: 'document', documentIds: [] } }],
      [
        'a pre-expanded documents payload',
        { event: { triggerType: 'document', documents: [{ _id: 'doc-1', _index: 'logs' }] } },
      ],
    ])('returns inputs unchanged for %s', async (_name, inputs) => {
      const result = await preprocessDocumentInputs(inputs, mockContext, mockLogger);

      expect(result).toEqual(inputs);
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });
  });

  describe('when documentIds are present', () => {
    it('fetches the selection in a single mget and expands it into event.documents', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'doc-1',
            _index: 'logs-default',
            _source: { '@timestamp': '2024-01-01T00:00:00Z', 'host.name': 'host-1' },
          },
          {
            found: true,
            _id: 'doc-2',
            _index: 'logs-default',
            _source: { '@timestamp': '2024-01-02T00:00:00Z', 'host.name': 'host-2' },
          },
        ],
      });

      const result = await preprocessDocumentInputs(
        { event: { triggerType: 'document', documentIds } },
        mockContext,
        mockLogger
      );

      expect(mockEsClient.mget).toHaveBeenCalledTimes(1);
      expect(mockEsClient.mget).toHaveBeenCalledWith({ docs: documentIds });
      // Each expanded document keeps the `{ _id, _index, ...source }` shape a caller would
      // otherwise have embedded, so a workflow cannot tell the two paths apart.
      expect(result.event).toEqual({
        triggerType: 'document',
        documents: [
          {
            _id: 'doc-1',
            _index: 'logs-default',
            '@timestamp': '2024-01-01T00:00:00Z',
            'host.name': 'host-1',
          },
          {
            _id: 'doc-2',
            _index: 'logs-default',
            '@timestamp': '2024-01-02T00:00:00Z',
            'host.name': 'host-2',
          },
        ],
      });
    });

    it('drops documentIds from the expanded event', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [{ found: true, _id: 'doc-1', _index: 'logs-default', _source: { a: 1 } }],
      });

      const result = await preprocessDocumentInputs(
        { event: { triggerType: 'document', documentIds: [documentIds[0]] } },
        mockContext,
        mockLogger
      );

      expect(result.event).not.toHaveProperty('documentIds');
    });

    it('preserves other input fields and other event fields', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [{ found: true, _id: 'doc-1', _index: 'logs-default', _source: { a: 1 } }],
      });

      const result = await preprocessDocumentInputs(
        {
          event: { triggerType: 'document', documentIds: [documentIds[0]], dataView: 'logs-*' },
          otherField: 'should be preserved',
        },
        mockContext,
        mockLogger
      );

      expect(result.otherField).toBe('should be preserved');
      expect(result.event).toMatchObject({ triggerType: 'document', dataView: 'logs-*' });
    });

    it('skips and logs documents that no longer exist', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          { found: true, _id: 'doc-1', _index: 'logs-default', _source: { a: 1 } },
          { found: false, _id: 'doc-2', _index: 'logs-default' },
        ],
      });

      const result = await preprocessDocumentInputs(
        { event: { triggerType: 'document', documentIds } },
        mockContext,
        mockLogger
      );

      expect((result.event as { documents: unknown[] }).documents).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Document not found: doc-2 in index logs-default'
      );
    });

    it('throws when none of the selected documents are found', async () => {
      mockEsClient.mget.mockResolvedValue({
        docs: [
          { found: false, _id: 'doc-1', _index: 'logs-default' },
          { found: false, _id: 'doc-2', _index: 'logs-default' },
        ],
      });

      await expect(
        preprocessDocumentInputs(
          { event: { triggerType: 'document', documentIds } },
          mockContext,
          mockLogger
        )
      ).rejects.toThrow('No documents found with the provided IDs');
    });

    it('rejects a selection larger than the supported maximum without querying', async () => {
      const tooMany = Array.from({ length: MAX_RUN_WORKFLOW_DOCS + 1 }, (_, i) => ({
        _id: `doc-${i}`,
        _index: 'logs-default',
      }));

      await expect(
        preprocessDocumentInputs(
          { event: { triggerType: 'document', documentIds: tooMany } },
          mockContext,
          mockLogger
        )
      ).rejects.toThrow(`Cannot run a workflow on more than ${MAX_RUN_WORKFLOW_DOCS} documents`);

      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });

    it('surfaces Elasticsearch errors', async () => {
      mockEsClient.mget.mockRejectedValue(new Error('Elasticsearch connection failed'));

      await expect(
        preprocessDocumentInputs(
          { event: { triggerType: 'document', documentIds } },
          mockContext,
          mockLogger
        )
      ).rejects.toThrow('Elasticsearch connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch documents')
      );
    });
  });
});
