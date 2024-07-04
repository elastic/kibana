/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fixupQuery } from '../autocomplete/helper';
import { getAstContext } from './context';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import type { EditorContext } from '../autocomplete/types';

describe('context', () => {
  describe('getAstContext', () => {
    const getContext = async (
      query: string,
      offset: number = query.length,
      editorContext: EditorContext = { triggerKind: 0, triggerCharacter: query[offset - 1] }
    ) => {
      const innerText = query.substring(0, offset);
      const fixedQuery = fixupQuery(query, offset, editorContext);
      const { ast } = await getAstAndSyntaxErrors(fixedQuery);
      const context = getAstContext(innerText, ast, offset);
      return { ast, context };
    };

    test('returns FROM command index editing context', async () => {
      const { context } = await getContext('from index, ');

      expect(context).toMatchObject({
        type: 'expression',
        command: {
          name: 'from',
        },
      });
    });

    test('returns FROM command METADATA editing context', async () => {
      const { context } = await getContext('from index METADATA _index, ');

      expect(context).toMatchObject({
        type: 'option',
        node: {
          type: 'option',
          name: 'metadata',
        },
        command: {
          name: 'from',
        },
      });
    });

    describe('METRICS <sources> [ <aggregates> [ BY <grouping> ]]', () => {
      describe('... <sources> ...', () => {
        test('returns "sources" position on space after command name', async () => {
          const { context } = await getContext('METRICS ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'sources',
          });
        });

        test('returns "sources" position on space after comma', async () => {
          const { context } = await getContext('METRICS index, ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'sources',
          });
        });
      });

      describe('... <aggregates> ...', () => {
        test('returns "aggregates" position on space after sources', async () => {
          const { context } = await getContext('METRICS index ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'aggregates',
          });
        });

        test('returns "aggregates" position on space after comma', async () => {
          const { context } = await getContext('METRICS index test, ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'aggregates',
          });
        });
      });

      describe('... BY <grouping> ...', () => {
        test('returns "grouping" position on space after "BY"', async () => {
          const { context } = await getContext('METRICS index aggregate BY ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'grouping',
          });
        });

        test('returns "grouping" position on space after comma', async () => {
          const { context } = await getContext('METRICS index aggregate BY grp1, ');

          expect(context).toMatchObject({
            type: 'expression',
            command: {
              name: 'metrics',
            },
            commandPosition: 'grouping',
          });
        });
      });
    });
  });
});
