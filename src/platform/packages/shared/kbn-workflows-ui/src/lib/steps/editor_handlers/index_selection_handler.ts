/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { DataViewsContract, MatchedItem } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows/types/latest';

export interface IndexSelectionHandlerServices {
  dataViews: DataViewsContract;
  application: ApplicationStart;
}
export interface IndexSelectionHandlerOptions {
  /** Maximum number of results to return from the search API. Defaults to 20. */
  maxResults?: number;
  /** Whether to allow wildcard patterns in the index selection handler. Defaults to false. */
  allowWildcard?: boolean;
  /** Whether to show all indices, including hidden and internal ones. Defaults to false. */
  showAllIndices?: boolean;
}
const DEFAULT_OPTIONS: Required<IndexSelectionHandlerOptions> = {
  maxResults: 20,
  allowWildcard: false,
  showAllIndices: false,
};

const indexLabel = i18n.translate('workflows.indexSelection.kindIndex', {
  defaultMessage: 'Index',
});
const aliasLabel = i18n.translate('workflows.indexSelection.kindAlias', {
  defaultMessage: 'Alias',
});
const dataStreamLabel = i18n.translate('workflows.indexSelection.kindDataStream', {
  defaultMessage: 'Data stream',
});

function getKindFromTags(item: MatchedItem): string {
  // Tag keys produced by `responseToItemArray` in @kbn/data-views-plugin:
  // 'index' | 'alias' | 'data_stream' (+ optional 'frozen', 'rollup').
  const primary = item.tags.find(
    (tag) => tag.key === 'index' || tag.key === 'alias' || tag.key === 'data_stream'
  );
  switch (primary?.key) {
    case 'alias':
      return aliasLabel;
    case 'data_stream':
      return dataStreamLabel;
    default:
      return indexLabel;
  }
}

function toSelectionOption(item: MatchedItem): SelectionOption<string> {
  return {
    value: item.name,
    description: i18n.translate('workflows.indexSelection.kind', {
      defaultMessage: 'Type: {kind}',
      values: { kind: getKindFromTags(item) },
    }),
  };
}

function toPatternSelectionOption(pattern: string, count: number): SelectionOption<string> {
  return {
    value: pattern,
    description: i18n.translate('workflows.indexSelection.wildcardSuggestion', {
      defaultMessage: 'Includes {count, plural, one {# source} other {# sources}}',
      values: { count },
    }),
  };
}

export const getIndexSelectionHandler = (
  services: IndexSelectionHandlerServices,
  options: IndexSelectionHandlerOptions = {}
): PropertySelectionHandler<string> => {
  const { dataViews, application } = services;
  const { maxResults, allowWildcard, showAllIndices } = { ...DEFAULT_OPTIONS, ...options };

  return {
    search: async (rawInput) => {
      const input = rawInput.trim();
      if (!input) {
        return [];
      }
      const results: Array<SelectionOption<string>> = [];
      try {
        const endsWithWildcard = input.endsWith('*');
        const pattern = endsWithWildcard ? input : `${input}*`;
        const matches = await dataViews.getIndices({
          pattern,
          showAllIndices,
          isRollupIndex: () => false,
        });

        // Suggest a wildcard pattern when the user hasn't typed one yet and there
        // are multiple matches under it. Surfaced first so it's easy to pick.
        if (allowWildcard && !endsWithWildcard && matches.length > 1) {
          results.push(toPatternSelectionOption(pattern, matches.length));
        }

        for (const item of matches) {
          if (results.length >= maxResults) {
            break;
          }
          results.push(toSelectionOption(item));
        }
      } catch {
        return [];
      }

      return results;
    },

    resolve: async (rawValue) => {
      const value = rawValue.trim();
      if (!value) {
        return null;
      }
      if (!allowWildcard && value.includes('*')) {
        return null;
      }
      try {
        const matches = await dataViews.getIndices({
          pattern: value,
          showAllIndices,
          isRollupIndex: () => false,
        });
        if (matches.length === 0) {
          return null;
        }
        if (matches.length === 1) {
          return toSelectionOption(matches[0]);
        }
        return toPatternSelectionOption(value, matches.length);
      } catch {
        return null;
      }
    },

    getDetails: async (input, _context, option) => {
      if (option) {
        const { description } = option;
        return {
          message: i18n.translate('workflows.indexSelection.detailsFound', {
            defaultMessage: '✓ index pattern `{input}` exists. \n{optionDescription}',
            values: { input, optionDescription: description ? `\n${description}` : '' },
          }),
          links: [],
        };
      }

      if (!allowWildcard && input.includes('*')) {
        return {
          message: i18n.translate('workflows.indexSelection.detailsWildcardNotAllowed', {
            defaultMessage: 'Wildcard patterns are not allowed.',
          }),
          links: [],
        };
      }

      const indexManagementUrl = application.getUrlForApp('management', {
        deepLinkId: 'index_management',
        absolute: true,
      });

      return {
        message: i18n.translate('workflows.indexSelection.detailsNotFound', {
          defaultMessage:
            'No indices, aliases, or data streams currently match `{pattern}`. The workflow can still run, matches are evaluated at execution time.',
          values: { pattern: input },
        }),
        links: [
          {
            text: i18n.translate('workflows.indexSelection.openIndexManagement', {
              defaultMessage: 'Open Index Management',
            }),
            path: indexManagementUrl,
          },
        ],
      };
    },
  };
};
