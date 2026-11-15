/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FetchIndexResponse } from '../actions';
import { evaluateIndex, hasWrites, type IndexEvaluation } from './evaluate_index';
import {
  KIBANA_VERSION,
  SERVERLESS_INPUTS,
  createTestContext,
  fetchIndicesResponse,
  indexMappingsWith,
} from './test_helpers/context';

const PREVIOUS_VERSION = '9.3.0';
const NEWER_VERSION = '9.5.0';

const expectUpdate = (evaluation: IndexEvaluation) => {
  if (evaluation.type !== 'update') {
    throw new Error(`Expected an update, got ${JSON.stringify(evaluation)}`);
  }
  return evaluation;
};

describe('evaluateIndex', () => {
  const context = createTestContext();
  const upToDate = indexMappingsWith(context);
  const outdatedFoo = indexMappingsWith(context, {
    mappingVersions: { foo: '10.1.0', bar: '10.1.0' },
    docVersions: { foo: '10.1.0', bar: '10.1.0' },
  });

  describe('when the index does not exist', () => {
    it('creates the first index, with the prefix and version aliases', () => {
      expect(evaluateIndex(context, {})).toEqual({
        type: 'create',
        currentIndex: '.kibana_1',
        aliases: ['.kibana', `.kibana_${KIBANA_VERSION}`],
      });
    });

    it('waits for another node to create it, if this node waits for migrations', () => {
      const waiting = createTestContext({ inputs: { waitForMigrationCompletion: true } });
      expect(evaluateIndex(waiting, {})).toMatchObject({ type: 'wait' });
    });
  });

  describe('fails', () => {
    const expectFatal = (indices: FetchIndexResponse, reason: RegExp, ctx = context) => {
      const evaluation = evaluateIndex(ctx, indices);
      expect(evaluation.type).toBe('fatal');
      expect(evaluation).toHaveProperty('reason', expect.stringMatching(reason));
    };

    it('when an alias points to multiple indices', () => {
      expectFatal(
        {
          ...fetchIndicesResponse({ name: '.kibana_1', mappings: upToDate }),
          ...fetchIndicesResponse({ name: '.kibana_2', mappings: upToDate }),
        },
        /The \.kibana alias is pointing to multiple indices/
      );
    });

    it('when a concrete index is named after the prefix', () => {
      expectFatal(
        fetchIndicesResponse({ name: '.kibana', aliases: [], mappings: upToDate }),
        /The \.kibana index was created by an unsupported Kibana version/
      );
    });

    it('when the index has no mappingVersions in its _meta', () => {
      expectFatal(
        fetchIndicesResponse({ mappings: { ...upToDate, _meta: {} } }),
        /The \.kibana_1 index was created by an unsupported Kibana version/
      );
    });

    it('when the index has a write block, before writing anything', () => {
      const [[name, index]] = Object.entries(fetchIndicesResponse({ mappings: outdatedFoo }));
      expectFatal(
        { [name]: { ...index, settings: { index: { blocks: { write: 'true' } } } } },
        /The \.kibana_1 index has a write block.*"index\.blocks\.write": false/
      );
    });

    it('when the index has no version aliases', () => {
      expectFatal(
        fetchIndicesResponse({ aliases: ['.kibana'], mappings: upToDate }),
        /The \.kibana_1 index was created by an unsupported Kibana version/
      );
    });

    it('when the index was last written by a version older than the minimum previous version', () => {
      expectFatal(
        fetchIndicesResponse({ aliases: ['.kibana', '.kibana_8.17.0'], mappings: upToDate }),
        /Kibana 8\.17\.0 deployment detected\. Please upgrade to Kibana 8\.18\.0 or newer before upgrading to 9\.x series/,
        createTestContext({ minimumPreviousVersion: '8.18.0' })
      );
    });

    it('when the index was last written by a newer Kibana, on classic deployments', () => {
      expectFatal(
        fetchIndicesResponse({
          aliases: ['.kibana', `.kibana_${NEWER_VERSION}`],
          mappings: upToDate,
        }),
        /The \.kibana_9\.5\.0 alias refers to a newer version of Kibana: v9\.5\.0/
      );
    });

    it('when the index has newer model versions, on classic deployments', () => {
      expectFatal(
        fetchIndicesResponse({
          mappings: indexMappingsWith(context, {
            mappingVersions: { foo: '10.3.0', bar: '10.1.0' },
            docVersions: { foo: '10.3.0', bar: '10.1.0' },
          }),
        }),
        /The \.kibana_1 index was last updated by a newer version of Kibana/
      );
    });

    it('when model versions are both higher and lower than the index ones', () => {
      expectFatal(
        fetchIndicesResponse({
          mappings: indexMappingsWith(context, {
            mappingVersions: { foo: '10.1.0', bar: '10.2.0' },
            docVersions: { foo: '10.1.0', bar: '10.2.0' },
          }),
        }),
        /Model version conflict/
      );
    });
  });

  describe('when the index is up to date', () => {
    it('plans no work', () => {
      const evaluation = expectUpdate(
        evaluateIndex(context, fetchIndicesResponse({ mappings: upToDate }))
      );
      expect(evaluation).toMatchObject({ currentIndex: '.kibana_1', previousMappings: upToDate });
      expect(hasWrites(evaluation)).toBe(false);
    });

    it('finds the index through the prefix alias, whatever its name', () => {
      const evaluation = evaluateIndex(
        context,
        fetchIndicesResponse({ name: '.kibana_8.18.0_001', mappings: upToDate })
      );
      expect(evaluation).toMatchObject({ type: 'update', currentIndex: '.kibana_8.18.0_001' });
    });

    it('ignores the indices of longer prefixes', () => {
      const evaluation = evaluateIndex(context, {
        ...fetchIndicesResponse({ mappings: upToDate }),
        ...fetchIndicesResponse({
          name: '.kibana_task_manager_1',
          aliases: ['.kibana_task_manager', 'duplicated'],
          mappings: upToDate,
        }),
        ...fetchIndicesResponse({
          name: '.kibana_task_manager_2',
          aliases: ['duplicated'],
          mappings: upToDate,
        }),
      });
      expect(evaluation).toMatchObject({ type: 'update', currentIndex: '.kibana_1' });
    });

    it('does not wait, even if this node waits for migrations', () => {
      const waiting = createTestContext({ inputs: { waitForMigrationCompletion: true } });
      expect(evaluateIndex(waiting, fetchIndicesResponse({ mappings: upToDate })).type).toBe(
        'update'
      );
    });
  });

  describe('when a type has new model versions', () => {
    const indices = fetchIndicesResponse({ mappings: outdatedFoo });

    it('updates the mappings and converts the documents', () => {
      expect(evaluateIndex(context, indices)).toMatchObject({
        type: 'update',
        updateMappings: true,
        convertDocuments: true,
        aliasActions: [],
      });
    });

    it('updates the mappings but leaves the documents to other nodes, if this node does not migrate documents', () => {
      const uiNode = createTestContext({
        inputs: { ...SERVERLESS_INPUTS, migrateDocuments: false },
      });
      expect(evaluateIndex(uiNode, indices)).toMatchObject({
        updateMappings: true,
        convertDocuments: false,
      });
    });

    it('waits for another node to perform the migration, if this node waits for migrations', () => {
      const waiting = createTestContext({
        inputs: { waitForMigrationCompletion: true, migrateDocuments: false },
      });
      expect(evaluateIndex(waiting, indices)).toMatchObject({ type: 'wait' });
    });
  });

  it('updates the mappings when a root field changed, even if no model version changed', () => {
    const { managed, ...properties } = upToDate.properties;
    expect(managed).toBeDefined();
    expect(
      evaluateIndex(context, fetchIndicesResponse({ mappings: { ...upToDate, properties } }))
    ).toMatchObject({ type: 'update', updateMappings: true });
  });

  it('converts the documents of an index last written by v2, which has no docVersions', () => {
    const { docVersions, ...meta } = upToDate._meta ?? {};
    expect(docVersions).toBeDefined();
    expect(
      evaluateIndex(context, fetchIndicesResponse({ mappings: { ...upToDate, _meta: meta } }))
    ).toMatchObject({ type: 'update', updateMappings: false, convertDocuments: true });
  });

  describe('on a Kibana upgrade without model version changes', () => {
    const indices = fetchIndicesResponse({
      aliases: ['.kibana', `.kibana_${PREVIOUS_VERSION}`],
      mappings: upToDate,
    });

    it('adds the version alias and removes the previous one, leaving the documents untouched', () => {
      expect(evaluateIndex(context, indices)).toMatchObject({
        type: 'update',
        updateMappings: false,
        convertDocuments: false,
        aliasActions: [
          { add: { index: '.kibana_1', alias: `.kibana_${KIBANA_VERSION}` } },
          {
            remove: {
              index: '.kibana_1',
              alias: `.kibana_${PREVIOUS_VERSION}`,
              must_exist: true,
            },
          },
        ],
      });
    });

    it('keeps the previous version aliases on serverless', () => {
      const serverless = createTestContext({ inputs: SERVERLESS_INPUTS });
      expect(expectUpdate(evaluateIndex(serverless, indices)).aliasActions).toEqual([
        { add: { index: '.kibana_1', alias: `.kibana_${KIBANA_VERSION}` } },
      ]);
    });
  });

  describe('on serverless rollbacks', () => {
    const serverless = createTestContext({ inputs: SERVERLESS_INPUTS });

    it('leaves an index with newer model versions untouched', () => {
      const evaluation = expectUpdate(
        evaluateIndex(
          serverless,
          fetchIndicesResponse({
            mappings: indexMappingsWith(serverless, {
              mappingVersions: { foo: '10.3.0', bar: '10.1.0' },
              docVersions: { foo: '10.3.0', bar: '10.1.0' },
            }),
          })
        )
      );
      expect(hasWrites(evaluation)).toBe(false);
    });

    it('accepts an index whose latest version alias is newer', () => {
      const evaluation = evaluateIndex(
        serverless,
        fetchIndicesResponse({
          aliases: ['.kibana', `.kibana_${KIBANA_VERSION}`, `.kibana_${NEWER_VERSION}`],
          mappings: upToDate,
        })
      );
      expect(evaluation.type).toBe('update');
    });
  });
});
