/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES } from '../../../../../common/enums';
import { createCustomFieldFormatter } from '../../../../lib/vis_data/create_custom_field_formatter';
import type { Panel, Series, PanelData } from '../../../../../common/types';
import type { FieldFormatsRegistry } from '../../../../../../data/common';
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
    const termsField = series.terms_field;

    const { indexPattern } = await cachedIndexPatternFetcher({ id: meta.index });
    const customFieldFormatter = createCustomFieldFormatter(
      fieldFormatService,
      indexPattern?.fieldFormatMap
    );

    if (termsField && customFieldFormatter) {
      results
        .filter(
          ({ seriesId }) => series.split_mode === BUCKET_TYPES.TERMS && series.id === seriesId
        )
        .forEach((item) => {
          item.label = customFieldFormatter(termsField).convert(item.label);
        });
    }

    return next(results);
  };
}
