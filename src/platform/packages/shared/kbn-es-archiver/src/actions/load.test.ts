/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';

import { isSavedObjectIndex } from '../lib/indices/kibana_index';
import {
  createStubClient,
  createStubLogger,
  createStubStats,
} from '../lib/indices/__mocks__/stubs';
import { deleteCreatedTargets } from './load';

describe('loadAction - dataOnly validation', () => {
  describe('isSavedObjectIndex', () => {
    it('should identify .kibana saved object indices', () => {
      expect(isSavedObjectIndex('.kibana_8.17.0_001')).toBe(true);
      expect(isSavedObjectIndex('.kibana_task_manager_8.17.0_001')).toBe(true);
      expect(isSavedObjectIndex('.kibana')).toBe(true);
      expect(isSavedObjectIndex('.kibana_1')).toBe(true);
    });

    it('should not flag non-saved-object indices', () => {
      expect(isSavedObjectIndex('logs-test')).toBe(false);
      expect(isSavedObjectIndex('metrics-test')).toBe(false);
      expect(isSavedObjectIndex('.kibana_security_session_1')).toBe(false);
      expect(isSavedObjectIndex(undefined)).toBe(false);
    });
  });
});

describe('deleteCreatedTargets', () => {
  const log = createStubLogger();

  it('deletes the indices and data streams a failed load created', async () => {
    const client = createStubClient(['half-loaded-index']);
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [
        { type: 'index', name: 'half-loaded-index' },
        { type: 'data_stream', name: 'half-loaded-stream', template: 'half-loaded-template' },
      ],
    });

    expect((client.indices.delete as sinon.SinonSpy).args[0][0]).toEqual({
      index: ['half-loaded-index'],
    });
    expect((client.indices.deleteDataStream as sinon.SinonSpy).args[0][0]).toEqual({
      name: 'half-loaded-stream',
    });
    expect((client.indices.deleteIndexTemplate as sinon.SinonSpy).args[0][0]).toEqual({
      name: 'half-loaded-template',
    });
    expect(stats.getTestSummary()).toEqual({ deletedIndex: 1, deletedDataStream: 1 });
  });

  it('leaves saved object indices alone', async () => {
    const client = createStubClient(['.kibana_1']);
    const stats = createStubStats();

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [{ type: 'index', name: '.kibana_1' }],
    });

    sinon.assert.notCalled(client.indices.delete as sinon.SinonSpy);
    expect(stats.getTestSummary()).toEqual({});
  });

  it('keeps cleaning up when deleting one target fails', async () => {
    const client = createStubClient(['other-index']);
    const stats = createStubStats();
    client.indices.deleteDataStream = sinon.stub().rejects(new Error('nope'));

    await deleteCreatedTargets({
      client,
      stats,
      log,
      createdTargets: [
        { type: 'data_stream', name: 'doomed-stream', template: 'doomed-template' },
        { type: 'index', name: 'other-index' },
      ],
    });

    expect(stats.getTestSummary()).toEqual({ deletedIndex: 1 });
  });
});
