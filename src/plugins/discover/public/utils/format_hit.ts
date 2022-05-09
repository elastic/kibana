/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { flattenHit } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { formatFieldValue } from './format_value';

const formattedHitCache = new WeakMap<estypes.SearchHit, FormattedHit>();

type FormattedHit = Array<readonly [fieldName: string, formattedValue: string]>;

/**
 * Returns a formatted document in form of key/value pairs of the fields name and a formatted value.
 * The value returned in each pair is an HTML string which is safe to be applied to the DOM, since
 * it's formatted using field formatters.
 * @param hit The hit to format
 * @param dataView The corresponding data view
 * @param fieldsToShow A list of fields that should be included in the document summary.
 */
export function formatHit(
  hit: estypes.SearchHit,
  dataView: DataView,
  fieldsToShow: string[],
  maxEntries: number,
  fieldFormats: FieldFormatsStart
): FormattedHit {
  const cached = formattedHitCache.get(hit);
  if (cached) {
    return cached;
  }

  const highlights = hit.highlight ?? {};
  // Flatten the object using the flattenHit implementation we use across Discover for flattening documents.
  const flattened = flattenHit(hit, dataView, { includeIgnoredValues: true, source: true });

  const highlightPairs: Array<[fieldName: string, formattedValue: string]> = [];
  const sourcePairs: Array<[fieldName: string, formattedValue: string]> = [];

  // Add each flattened field into the corresponding array for highlighted or other fields,
  // depending on whether the original hit had a highlight for it. That way we can later
  // put highlighted fields first in the document summary.
  Object.entries(flattened).forEach(([key, val]) => {
    // Retrieve the (display) name of the fields, if it's a mapped field on the data view
    const displayKey = dataView.fields.getByName(key)?.displayName;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    // Format the raw value using the regular field formatters for that field
    const formattedValue = formatFieldValue(
      val,
      hit,
      fieldFormats,
      dataView,
      dataView.fields.getByName(key)
    );
    // If the field was a mapped field, we validate it against the fieldsToShow list, if not
    // we always include it into the result.
    if (displayKey) {
      if (fieldsToShow.includes(key)) {
        pairs.push([displayKey, formattedValue]);
      }
    } else {
      pairs.push([key, formattedValue]);
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
            i18n.translate('discover.utils.formatHit.moreFields', {
              defaultMessage: 'and {count} more {count, plural, one {field} other {fields}}',
              values: { count: pairs.length - maxEntries },
            }),
            '',
          ] as const,
        ];
  formattedHitCache.set(hit, formatted);
  return formatted;
}
