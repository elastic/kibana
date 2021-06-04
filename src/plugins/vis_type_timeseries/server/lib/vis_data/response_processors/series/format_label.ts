/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES } from '../../../../../common/enums';
import type { Panel, Series, PanelData } from '../../../../../common/types';
import type { CustomFieldFormatter } from '../../get_custom_field_formatter';
import type { createFieldsFetcher } from '../../../search_strategies/lib/fields_fetcher';

export function formatLabel(
  resp: unknown,
  panel: Panel,
  series: Series,
  meta: unknown,
  extractFields: ReturnType<typeof createFieldsFetcher>,
  customFieldFormatter?: CustomFieldFormatter
) {
  return (next: (results: PanelData[]) => unknown) => async (results: PanelData[]) => {
    const termsField = series.terms_field;

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
