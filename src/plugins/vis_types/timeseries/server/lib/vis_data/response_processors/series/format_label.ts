/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES, PANEL_TYPES } from '../../../../../common/enums';
import {
  getFieldsForTerms,
  MULTI_FIELD_VALUES_SEPARATOR,
} from '../../../../../common/fields_utils';
import type { Panel, PanelData, Series } from '../../../../../common/types';
import type { FieldFormat, FieldFormatsRegistry } from '../../../../../../../field_formats/common';
import type { createFieldsFetcher } from '../../../search_strategies/lib/fields_fetcher';
import type { CachedIndexPatternFetcher } from '../../../search_strategies/lib/cached_index_pattern_fetcher';
import type { DataView } from '../../../../../../../data_views/common';

const createCachedFieldFormatter = (indexPattern?: DataView | null) => {
  const cache = new Map<string, FieldFormat>();

  return (fieldName: string, value: string, contentType: 'text' | 'html' = 'text') => {
    if (cache.has(fieldName)) {
      return cache.get(fieldName)!.convert(value, contentType);
    }
    if (indexPattern) {
      const field = indexPattern.fields.find(({ name }) => name === fieldName);
      if (field) {
        const formatter = indexPattern.getFormatterForField(field);

        if (formatter) {
          cache.set(fieldName, formatter);
          return formatter.convert(value, contentType);
        }
      }
    }
  };
};

export function formatLabel(
  resp: unknown,
  panel: Panel,
  series: Series,
  meta: any,
  extractFields: ReturnType<typeof createFieldsFetcher>,
  fieldFormatService: FieldFormatsRegistry,
  cachedIndexPatternFetcher: CachedIndexPatternFetcher
) {
  return (next: (results: PanelData[]) => unknown) => async (results: PanelData[]) => {
    const { terms_field: termsField, split_mode: splitMode } = series;
    const termsIds = getFieldsForTerms(termsField);

    // no need to format labels for markdown as they also used there as variables keys
    const shouldFormatLabels =
      termsIds.length && splitMode === BUCKET_TYPES.TERMS && panel.type !== PANEL_TYPES.MARKDOWN;

    if (shouldFormatLabels) {
      const { indexPattern } = await cachedIndexPatternFetcher({ id: meta.index });
      const formatField = createCachedFieldFormatter(indexPattern);

      results
        .filter(({ seriesId }) => series.id === seriesId)
        .forEach((item) => {
          const formatted = termsIds
            .map((i, index) =>
              formatField(i, (Array.isArray(item.label) ? item.label : [item.label])[index])
            )
            .join(MULTI_FIELD_VALUES_SEPARATOR);

          if (formatted) {
            item.label = formatted;
            item.labelFormatted = formatted;
          }
        });
    }

    return next(results);
  };
}
