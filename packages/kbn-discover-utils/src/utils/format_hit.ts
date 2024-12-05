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

// We use a special type here allowing formattedValue to be undefined because
// we want to avoid formatting values which will not be shown to users since
// it can be costly, and instead only format the ones which will be rendered
type PartialHitPair = [
  fieldDisplayName: string,
  formattedValue: string | undefined,
  fieldName: string | null
];

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
  const renderedPairs: PartialHitPair[] = [];
  const otherPairs: PartialHitPair[] = [];

  // Add each flattened field into the corresponding array for rendered or other pairs,
  // depending on whether the original hit had a highlight for it. That way we can ensure
  // highlighted fields are shown first in the document summary.
  for (const key of Object.keys(flattened)) {
    // Retrieve the (display) name of the fields, if it's a mapped field on the data view
    const field = dataView.fields.getByName(key);
    const displayKey = field?.displayName;
    const pairs = highlights[key] ? renderedPairs : otherPairs;

    // If the field is a mapped field, we first check if it should be shown,
    // or if it's highlighted, but the parent is not.
    // If not we always include it into the result.
    if (displayKey) {
      const multiParent = field.getSubtypeMulti?.()?.multi.parent;
      const isHighlighted = Boolean(highlights[key]);
      const isParentHighlighted = Boolean(multiParent && highlights[multiParent]);

      if ((isHighlighted && !isParentHighlighted) || shouldShowFieldHandler(key)) {
        pairs.push([displayKey, undefined, key]);
      }
    } else {
      pairs.push([key, undefined, key]);
    }
  }

  const totalLength = renderedPairs.length + otherPairs.length;

  // Truncate the renderedPairs if it exceeds the maxEntries,
  // otherwise fill it up with otherPairs until it reaches maxEntries
  if (renderedPairs.length > maxEntries) {
    renderedPairs.length = maxEntries;
  } else if (renderedPairs.length < maxEntries && otherPairs.length) {
    for (let i = 0; i < otherPairs.length && renderedPairs.length < maxEntries; i++) {
      renderedPairs.push(otherPairs[i]);
    }
  }

  // Now format only the values which will be shown to the user
  for (const pair of renderedPairs) {
    const key = pair[2]!;

    // Format the raw value using the regular field formatters for that field
    pair[1] = formatFieldValue(
      flattened[key],
      hit.raw,
      fieldFormats,
      dataView,
      dataView.getFieldByName(key)
    );
  }

  // If document has more formatted fields than configured via MAX_DOC_FIELDS_DISPLAYED we cut
  // off additional fields and instead show a summary how many more field exists.
  if (totalLength > maxEntries) {
    renderedPairs.push([
      i18n.translate('discover.formatHit.moreFields', {
        defaultMessage: 'and {count} more {count, plural, one {field} other {fields}}',
        values: { count: totalLength - maxEntries },
      }),
      '',
      null,
    ]);
  }

  const formattedHit = renderedPairs as FormattedHit;

  formattedHitCache.set(hit.raw, { formattedHit, maxEntries });

  return formattedHit;
}
