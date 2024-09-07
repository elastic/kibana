/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  const flattened = hit.flattened;
  const flattenedKeys = Object.keys(flattened);
  const formattedHit: FormattedHit = [];

  let totalCount = 0;

  const maybeAddToFormattedHit = (key: string) => {
    const field = dataView.fields.getByName(key);

    // If the field was a mapped field, we validate it against the fieldsToShow list, if not
    // we always include it into the result.
    if (field?.displayName) {
      if (shouldShowFieldHandler(key)) {
        if (++totalCount > maxEntries) {
          return;
        }

        formattedHit.push([
          // Retrieve the (display) name of the fields, if it's a mapped field on the data view
          field.displayName,
          // Format the raw value using the regular field formatters for that field
          formatFieldValue(flattened[key], hit.raw, fieldFormats, dataView, field),
          key,
        ]);
      }
    } else {
      if (++totalCount > maxEntries) {
        return;
      }

      formattedHit.push([
        key,
        // Format the raw value using the regular field formatters for that field
        formatFieldValue(flattened[key], hit.raw, fieldFormats, dataView, field),
        key,
      ]);
    }
  };

  // Add highlighted fields first if any exist
  if (Object.keys(highlights).length) {
    for (const key of flattenedKeys) {
      if (highlights[key]) {
        maybeAddToFormattedHit(key);
      }
    }
  }

  // Add remaining fields after
  for (const key of flattenedKeys) {
    if (!highlights[key]) {
      maybeAddToFormattedHit(key);
    }
  }

  // If document has more formatted fields than configured via MAX_DOC_FIELDS_DISPLAYED we cut
  // off additional fields and instead show a summary how many more field exists.
  if (totalCount > maxEntries) {
    formattedHit.push([
      i18n.translate('discover.formatHit.moreFields', {
        defaultMessage: 'and {count} more {count, plural, one {field} other {fields}}',
        values: { count: totalCount - maxEntries },
      }),
      '',
      null,
    ]);
  }

  formattedHitCache.set(hit.raw, { formattedHit, maxEntries });

  return formattedHit;
}
