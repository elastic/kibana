/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import sinon from 'sinon';
import { ToolingLog } from '@kbn/tooling-log';
import { Stats } from '../../stats';

type StubStats = Stats & {
  getTestSummary: () => Record<string, number>;
};

export const createStubStats = (): StubStats =>
  ({
    createdIndex: sinon.stub(),
    createdAliases: sinon.stub(),
    deletedIndex: sinon.stub(),
    skippedIndex: sinon.stub(),
    archivedIndex: sinon.stub(),
    getTestSummary() {
      const summary: Record<string, number> = {};
      Object.keys(this).forEach((key) => {
        if (this[key].callCount) {
          summary[key] = this[key].callCount;
        }
      });
      return summary;
    },
  } as any);

export const createStubLogger = (): ToolingLog =>
  ({
    debug: sinon.stub(),
    info: sinon.stub(),
    success: sinon.stub(),
    warning: sinon.stub(),
    error: sinon.stub(),
  } as any);

export const createStubIndexRecord = (index: string, aliases = {}) => ({
  type: 'index',
  value: { index, aliases },
});

export const createStubDocRecord = (index: string, id: number) => ({
  type: 'doc',
  value: { index, id },
});

const createEsClientError = (errorType: string) => {
  const err = new Error(`ES Client Error Stub "${errorType}"`);
  (err as any).meta = {
    body: {
      error: {
        type: errorType,
      },
    },
  };
  return err;
};

const indexAlias = (aliases: Record<string, any>, index: string) =>
  Object.keys(aliases).find((k) => aliases[k] === index);

type StubClient = Client;

export const createStubClient = (
  existingIndices: string[] = [],
  aliases: Record<string, any> = {}
): StubClient =>
  ({
    indices: {
      get: sinon.spy(async ({ index }) => {
        if (!existingIndices.includes(index)) {
          throw createEsClientError('index_not_found_exception');
        }

        return {
          body: {
            [index]: {
              mappings: {},
              settings: {},
            },
          },
        };
      }),
      getAlias: sinon.spy(async ({ index, name }) => {
        if (index && existingIndices.indexOf(index) >= 0) {
          const result = indexAlias(aliases, index);
          return { body: { [index]: { aliases: result ? { [result]: {} } : {} } } };
        }

        if (name && aliases[name]) {
          return { body: { [aliases[name]]: { aliases: { [name]: {} } } } };
        }

        return { statusCode: 404 };
      }),
      updateAliases: sinon.spy(async ({ body }) => {
        body.actions.forEach(
          ({ add: { index, alias } }: { add: { index: string; alias: string } }) => {
            if (!existingIndices.includes(index)) {
              throw createEsClientError('index_not_found_exception');
            }
            existingIndices.push({ index, alias } as any);
          }
        );

        return { body: { ok: true } };
      }),
      create: sinon.spy(async ({ index }) => {
        if (existingIndices.includes(index) || aliases.hasOwnProperty(index)) {
          throw createEsClientError('resource_already_exists_exception');
        } else {
          existingIndices.push(index);
          return { body: { ok: true } };
        }
      }),
      delete: sinon.spy(async ({ index }) => {
        const indices = Array.isArray(index) ? index : [index];
        if (indices.every((ix) => existingIndices.includes(ix))) {
          // Delete aliases associated with our indices
          indices.forEach((ix) => {
            const alias = Object.keys(aliases).find((k) => aliases[k] === ix);
            if (alias) {
              delete aliases[alias];
            }
          });
          indices.forEach((ix) => existingIndices.splice(existingIndices.indexOf(ix), 1));
          return { body: { ok: true } };
        } else {
          throw createEsClientError('index_not_found_exception');
        }
      }),
      exists: sinon.spy(async () => {
        throw new Error('Do not use indices.exists(). React to errors instead.');
      }),
    },
  } as any);
