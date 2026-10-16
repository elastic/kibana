/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type sinon from 'sinon';

import { isSavedObjectIndex } from '../lib/indices/kibana_index';
import { createStubClient, createStubLogger } from '../lib/indices/__mocks__/stubs';
import { loadAction } from './load';

describe('loadAction - rollback', () => {
  let inputDir: string;

  beforeAll(() => {
    inputDir = mkdtempSync(join(tmpdir(), 'es-archiver-load-'));
    writeFileSync(
      join(inputDir, 'mappings.json'),
      JSON.stringify({
        type: 'index',
        value: { index: 'logstash-2015.09.22', aliases: {}, mappings: {}, settings: {} },
      })
    );
    writeFileSync(
      join(inputDir, 'data.json'),
      JSON.stringify({
        type: 'doc',
        value: { index: 'logstash-2015.09.22', id: '1', source: { bytes: 1623 } },
      })
    );
  });

  afterAll(() => {
    rmSync(inputDir, { recursive: true, force: true });
  });

  it('deletes the indices it created when indexing the docs fails', async () => {
    const client = createStubClient(
      [],
      {},
      {
        bulk: async () => {
          throw new Error('Request timed out');
        },
      }
    );

    await expect(
      loadAction({
        inputDir,
        skipExisting: false,
        useCreate: false,
        dataOnly: true,
        client,
        log: createStubLogger(),
      })
    ).rejects.toThrow('Request timed out');

    expect((client.indices.delete as sinon.SinonSpy).args.map(([{ index }]) => index)).toEqual([
      ['logstash-2015.09.22'],
    ]);
  });
});

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
