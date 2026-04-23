/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./actions', () => ({
  loadAction: jest.fn().mockResolvedValue({}),
  saveAction: jest.fn(),
  unloadAction: jest.fn(),
  rebuildAllAction: jest.fn(),
  emptyKibanaIndexAction: jest.fn(),
  editAction: jest.fn(),
}));

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { EsArchiver } from './es_archiver';
import { loadAction } from './actions';

const createMockClient = () => ({} as unknown as Client);
const createMockKbnClient = () => ({} as unknown as KbnClient);
const log = new ToolingLog();

describe('EsArchiver', () => {
  describe('constructor', () => {
    it('should require kbnClient when dataOnly is not set', () => {
      expect(
        () =>
          new EsArchiver({
            client: createMockClient(),
            log,
          })
      ).toThrow('kbnClient is required when dataOnly is not enabled');
    });

    it('should require kbnClient when dataOnly is false', () => {
      expect(
        () =>
          new EsArchiver({
            client: createMockClient(),
            log,
            dataOnly: false,
          })
      ).toThrow('kbnClient is required when dataOnly is not enabled');
    });

    it('should not require kbnClient when dataOnly is true', () => {
      expect(
        () =>
          new EsArchiver({
            client: createMockClient(),
            log,
            dataOnly: true,
          })
      ).not.toThrow();
    });

    it('should accept kbnClient with dataOnly false', () => {
      expect(
        () =>
          new EsArchiver({
            client: createMockClient(),
            log,
            kbnClient: createMockKbnClient(),
            dataOnly: false,
          })
      ).not.toThrow();
    });

    it('should accept kbnClient without dataOnly (backward compat)', () => {
      expect(
        () =>
          new EsArchiver({
            client: createMockClient(),
            log,
            kbnClient: createMockKbnClient(),
          })
      ).not.toThrow();
    });
  });

  describe('load', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should pass dataOnly=true to loadAction when in dataOnly mode', async () => {
      const client = createMockClient();
      const archiver = new EsArchiver({
        client,
        log,
        dataOnly: true,
        baseDir: __dirname,
      });

      (loadAction as jest.Mock).mockResolvedValue({});
      await archiver.load('lib');

      expect(loadAction as jest.Mock).toHaveBeenCalledTimes(1);
      expect((loadAction as jest.Mock).mock.calls[0][0]).toMatchObject({
        dataOnly: true,
        kbnClient: undefined,
      });
    });

    it('should pass dataOnly=false to loadAction when not in dataOnly mode', async () => {
      const client = createMockClient();
      const kbnClient = createMockKbnClient();
      const archiver = new EsArchiver({
        client,
        log,
        kbnClient,
        baseDir: __dirname,
      });

      (loadAction as jest.Mock).mockResolvedValue({});
      await archiver.load('lib');

      expect(loadAction as jest.Mock).toHaveBeenCalledTimes(1);
      expect((loadAction as jest.Mock).mock.calls[0][0]).toMatchObject({
        dataOnly: false,
        kbnClient,
      });
    });
  });

  describe('emptyKibanaIndex', () => {
    it('should throw in dataOnly mode', async () => {
      const archiver = new EsArchiver({
        client: createMockClient(),
        log,
        dataOnly: true,
      });

      await expect(archiver.emptyKibanaIndex()).rejects.toThrow(
        'emptyKibanaIndex is not supported in dataOnly mode'
      );
    });
  });
});
