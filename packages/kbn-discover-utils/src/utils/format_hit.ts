/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  DataTableRecord,
  ShouldShowFieldInTableHandler,
  FormattedHit,
  EsHitRecord,
} from '../types';
import { formatFieldValue } from './format_value';

const formattedHitCache = new WeakMap<
  EsHitRecord,
  { formattedHit: FormattedHit; maxEntries: number }
>();

/**
 * Returns a formatted document in form of key/value pairs of the fields name and a formatted value.
 * The value returned in each pair is an HTML string which is safe to be applied to the DOM, since
 * it's formatted using field formatters.
 * @param hit
 * @param dataView
 * @param shouldShowFieldHandler
 * @param maxEntries
 * @param fieldFormats
 */
export function formatHit(
  hit: DataTableRecord,
  dataView: DataView,
  shouldShowFieldHandler: ShouldShowFieldInTableHandler,
  maxEntries: number,
  fieldFormats: FieldFormatsStart
): FormattedHit {
  const cached = formattedHitCache.get(hit.raw);
  if (cached && cached.maxEntries === maxEntries) {
    return cached.formattedHit;
  }

  const highlights = hit.raw.highlight ?? {};
  // Flatten the object using the flattenHit implementation we use across Discover for flattening documents.
  const flattened = hit.flattened;

  const highlightPairs: FormattedHit = [];
  const sourcePairs: FormattedHit = [];

  // Add each flattened field into the corresponding array for highlighted or other fields,
  // depending on whether the original hit had a highlight for it. That way we can later
  // put highlighted fields first in the document summary.
  Object.entries(flattened).forEach(([key, val]) => {
    // Retrieve the (display) name of the fields, if it's a mapped field on the data view
    const field = dataView.fields.getByName(key);
    const displayKey = field?.displayName;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    // Format the raw value using the regular field formatters for that field
    const formattedValue = formatFieldValue(val, hit.raw, fieldFormats, dataView, field);
    // If the field was a mapped field, we validate it against the fieldsToShow list, if not
    // we always include it into the result.
    if (displayKey) {
      if (shouldShowFieldHandler(key)) {
        pairs.push([displayKey, formattedValue, key]);
      }
    } else {
      pairs.push([key, formattedValue, key]);
    }
  });
  const pairs = [...highlightPairs, ...sourcePairs];
  const formatted =
    // If document has more formatted fields than configured via MAX_DOC_FIELDS_DISPLAYED we cut
    // off additional fields and instead show a summary how many more field exists.
    pairs.length <= maxEntries
      ? pairs
      : [
          ...pairs.slice(0, maxEntries),
          [
            i18n.translate('discover.formatHit.moreFields', {
              defaultMessage: 'and {count} more {count, plural, one {field} other {fields}}',
              values: { count: pairs.length - maxEntries },
            }),
            '',
            null,
          ] as const,
        ];
  formattedHitCache.set(hit.raw, { formattedHit: formatted, maxEntries });
  return formatted;
}
