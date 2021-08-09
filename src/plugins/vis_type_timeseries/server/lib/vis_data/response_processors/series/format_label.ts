/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES, PANEL_TYPES } from '../../../../../common/enums';
import { createFieldFormatAccessor } from '../../../../lib/vis_data/create_field_format_accessor';
import type { Panel, PanelData, Series } from '../../../../../common/types';
import type { FieldFormatsRegistry } from '../../../../../../field_formats/common';
import type { createFieldsFetcher } from '../../../search_strategies/lib/fields_fetcher';
import type { CachedIndexPatternFetcher } from '../../../search_strategies/lib/cached_index_pattern_fetcher';

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

    const isKibanaIndexPattern = panel.use_kibana_indexes || panel.index_pattern === '';
    // no need to format labels for markdown as they also used there as variables keys
    const shouldFormatLabels =
      isKibanaIndexPattern &&
      termsField &&
      splitMode === BUCKET_TYPES.TERMS &&
      panel.type !== PANEL_TYPES.MARKDOWN;

    if (shouldFormatLabels) {
      const { indexPattern } = await cachedIndexPatternFetcher({ id: meta.index });
      const getFieldFormatByName = createFieldFormatAccessor(
        fieldFormatService,
        indexPattern?.fieldFormatMap
      );

      results
        .filter(({ seriesId }) => series.id === seriesId)
        .forEach((item) => {
          const itemFieldFormat = getFieldFormatByName(termsField!);
          item.label = item.labelFormatted = itemFieldFormat.convert(item.label);
        });
    }

    return next(results);
  };
}
