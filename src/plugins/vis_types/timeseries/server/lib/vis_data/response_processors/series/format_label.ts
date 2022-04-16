/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { BUCKET_TYPES, PANEL_TYPES, TSVB_METRIC_TYPES } from '../../../../../common/enums';
import {
  createCachedFieldValueFormatter,
  getFieldsForTerms,
  MULTI_FIELD_VALUES_SEPARATOR,
} from '../../../../../common/fields_utils';
import type { Panel, PanelData, Series } from '../../../../../common/types';
import type { createFieldsFetcher } from '../../../search_strategies/lib/fields_fetcher';
import type { CachedIndexPatternFetcher } from '../../../search_strategies/lib/cached_index_pattern_fetcher';
import type { BaseMeta } from '../../request_processors/types';
import { SanitizedFieldType } from '../../../../../common/types';

export function formatLabel(
  resp: unknown,
  panel: Panel,
  series: Series,
  meta: BaseMeta,
  extractFields: ReturnType<typeof createFieldsFetcher>,
  fieldFormatService: FieldFormatsRegistry,
  cachedIndexPatternFetcher: CachedIndexPatternFetcher
) {
  return (next: (results: PanelData[]) => unknown) => async (results: PanelData[]) => {
    const { terms_field: termsField, split_mode: splitMode } = series;
    const termsIds = getFieldsForTerms(termsField);

    const shouldFormatLabels =
      // no need to format labels for series_agg
      !series.metrics.some((m) => m.type === TSVB_METRIC_TYPES.SERIES_AGG) &&
      termsIds.length &&
      splitMode === BUCKET_TYPES.TERMS &&
      // no need to format labels for markdown as they also used there as variables keys
      panel.type !== PANEL_TYPES.MARKDOWN;

    if (shouldFormatLabels) {
      const fetchedIndex = meta.dataViewId
        ? await cachedIndexPatternFetcher({ id: meta.dataViewId })
        : undefined;

      let fields: SanitizedFieldType[] = [];

      if (!fetchedIndex?.indexPattern && meta.indexPatternString) {
        fields = await extractFields(meta.indexPatternString);
      }

      const formatField = createCachedFieldValueFormatter(
        fetchedIndex?.indexPattern,
        fields,
        fieldFormatService
      );

      results
        .filter(({ seriesId }) => series.id === seriesId)
        .forEach((item) => {
          const formatted = termsIds
            .map((i, index) => formatField(i, [item.label].flat()[index]))
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
