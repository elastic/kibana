/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_HIGHLIGHT_POST_TAG, DEFAULT_HIGHLIGHT_PRE_TAG } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType } from '../../../../../common/data_sources';
import type { ContextWithProfileId } from '../../../profile_service';
import type { DataSourceProfileProviderParams, RootContext } from '../../../profiles';
import { DataSourceCategory, SolutionType } from '../../../profiles';
import { createHighlightDataSourceProfileProvider } from './profile';

const RESOLUTION_MISMATCH = { isMatch: false };

const HIGHLIGHT_QUERY =
  'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })';

describe('highlightDataSourceProfileProvider', () => {
  const ROOT_CONTEXT: ContextWithProfileId<RootContext> = {
    profileId: 'highlight-data-source-profile',
    solutionType: SolutionType.Default,
  };

  const createParams = (
    overrides: Partial<DataSourceProfileProviderParams> = {}
  ): DataSourceProfileProviderParams => ({
    rootContext: ROOT_CONTEXT,
    dataSource: { type: DataSourceType.Esql },
    query: { esql: HIGHLIGHT_QUERY },
    ...overrides,
  });

  const provider = createHighlightDataSourceProfileProvider();

  describe('resolve', () => {
    describe('matches', () => {
      it('when ES|QL query has TOP_SNIPPETS with highlight enabled', async () => {
        const result = await provider.resolve(createParams());
        expect(result).toEqual({
          isMatch: true,
          context: {
            category: DataSourceCategory.Default,
            columnsWithHighlights: [
              {
                column: 'snippets',
                preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
                postTag: DEFAULT_HIGHLIGHT_POST_TAG,
              },
            ],
          },
        });
      });

      describe('does not match', () => {
        it('when data source is not ES|QL', async () => {
          const result = await provider.resolve(
            createParams({ dataSource: { type: DataSourceType.DataView, dataViewId: 'books' } })
          );
          expect(result).toEqual(RESOLUTION_MISMATCH);
        });

        it('when data source is undefined', async () => {
          const result = await provider.resolve(createParams({ dataSource: undefined }));
          expect(result).toEqual(RESOLUTION_MISMATCH);
        });

        it('when query is undefined', async () => {
          const result = await provider.resolve(createParams({ query: undefined }));
          expect(result).toEqual(RESOLUTION_MISMATCH);
        });

        it('when there are no columns with highlights', async () => {
          const result = await provider.resolve(
            createParams({
              query: {
                esql: 'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien")',
              },
            })
          );
          expect(result).toEqual(RESOLUTION_MISMATCH);
        });
      });
    });

    describe('getCellRenderers', () => {
      const buildCellRenderers = (
        columnsWithHighlights: Array<{
          column: string;
          preTag: string;
          postTag: string;
        }>
      ) => {
        const getCellRenderers = provider.profile.getCellRenderers!(() => ({}), {
          context: {
            category: DataSourceCategory.Default,
            columnsWithHighlights,
          },
        });
        return getCellRenderers({
          rowHeight: 1,
          actions: {},
          dataView: {} as DataView,
          density: undefined,
        });
      };

      it('registers a renderer for each highlighted column', () => {
        const renderers = buildCellRenderers([
          {
            column: 'snippets',
            preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
            postTag: DEFAULT_HIGHLIGHT_POST_TAG,
          },
          {
            column: 'titles',
            preTag: '<mark>',
            postTag: '</mark>',
          },
        ]);
        expect(renderers).toHaveProperty('snippets');
        expect(renderers).toHaveProperty('titles');
      });

      it('respects a columns previous renderer if the column is not highlighted', () => {
        const originalRenderer = jest.fn();
        const getCellRenderers = provider.profile.getCellRenderers!(
          () => ({ no_highlight_column: originalRenderer }),
          {
            context: {
              category: DataSourceCategory.Default,
              columnsWithHighlights: [
                {
                  column: 'snippets',
                  preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
                  postTag: DEFAULT_HIGHLIGHT_POST_TAG,
                },
              ],
            },
          }
        );
        const renderers = getCellRenderers({
          rowHeight: 1,
          actions: {},
          dataView: {} as DataView,
          density: undefined,
        });
        expect(renderers).toHaveProperty('no_highlight_column', originalRenderer);
        expect(renderers).toHaveProperty('snippets');
      });
    });
  });
});
