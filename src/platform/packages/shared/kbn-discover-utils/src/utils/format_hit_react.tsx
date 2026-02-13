/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, Fragment, memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, ShouldShowFieldInTableHandler, EsHitRecord } from '../types';
import { FormatFieldValueReact } from './format_value_react';

/**
 * A pair representing a formatted field for React rendering
 * [fieldDisplayName, formattedValue (ReactNode), fieldName | null]
 */
export type FormattedHitReactPair = readonly [
  fieldDisplayName: string,
  formattedValue: ReactNode,
  fieldName: string | null
];

/**
 * Pairs array for each field in the hit, with React nodes for values
 */
export type FormattedHitReact = FormattedHitReactPair[];

// We use a special type here allowing formattedValue to be undefined because
// we want to avoid formatting values which will not be shown to users since
// it can be costly, and instead only format the ones which will be rendered
type PartialHitPair = [
  fieldDisplayName: string,
  formattedValue: ReactNode | undefined,
  fieldName: string | null
];

const formattedHitReactCache = new WeakMap<
  EsHitRecord,
  { formattedHit: FormattedHitReact; maxEntries: number }
>();

interface FormatHitReactFieldValueProps {
  value: unknown;
  hit: DataTableRecord;
  fieldName: string;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
}

/**
 * Component to render a single formatted field value in the hit.
 * Memoized to prevent unnecessary re-renders.
 */
const FormatHitReactFieldValue = memo(
  ({ value, hit, fieldName, dataView, fieldFormats }: FormatHitReactFieldValueProps) => {
    return (
      <FormatFieldValueReact
        value={value}
        hit={hit.raw}
        fieldFormats={fieldFormats}
        dataView={dataView}
        field={dataView.getFieldByName(fieldName)}
      />
    );
  }
);

FormatHitReactFieldValue.displayName = 'FormatHitReactFieldValue';

/**
 * Returns a formatted document in form of key/value pairs of the field name and a React node.
 * This is the React equivalent of `formatHit` that returns React nodes instead of HTML strings.
 *
 * @param hit - The data table record
 * @param dataView - The data view
 * @param shouldShowFieldHandler - Function to determine if a field should be shown
 * @param maxEntries - Maximum number of entries to return
 * @param fieldFormats - Field formatters service
 */
export function formatHitReact(
  hit: DataTableRecord,
  dataView: DataView,
  shouldShowFieldHandler: ShouldShowFieldInTableHandler,
  maxEntries: number,
  fieldFormats: FieldFormatsStart
): FormattedHitReact {
  const cached = formattedHitReactCache.get(hit.raw);

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

    // Format the raw value using React components
    pair[1] = (
      <FormatHitReactFieldValue
        key={key}
        value={flattened[key]}
        hit={hit}
        fieldName={key}
        dataView={dataView}
        fieldFormats={fieldFormats}
      />
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
      <Fragment key="more-fields" />,
      null,
    ]);
  }

  const formattedHit = renderedPairs as FormattedHitReact;

  formattedHitReactCache.set(hit.raw, { formattedHit, maxEntries });

  return formattedHit;
}
