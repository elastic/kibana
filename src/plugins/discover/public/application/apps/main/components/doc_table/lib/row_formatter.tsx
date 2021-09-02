/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../../../../../common';
import { getServices, IndexPattern } from '../../../../../../kibana_services';

interface Props {
  defPairs: Array<[string, unknown]>;
}
const TemplateComponent = ({ defPairs }: Props) => {
  return (
    <dl className={'source truncate-by-height'}>
      {defPairs.map((pair, idx) => (
        <Fragment key={idx}>
          <dt>{pair[0]}:</dt>
          <dd
            // We  can dangerously set HTML here because this content is guaranteed to have been run through a valid field formatter first.
            dangerouslySetInnerHTML={{ __html: `${pair[1]}` }} // eslint-disable-line react/no-danger
          />{' '}
        </Fragment>
      ))}
    </dl>
  );
};

export const formatRow = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hit: Record<string, any>,
  indexPattern: IndexPattern,
  fieldsToShow: string[]
) => {
  const highlights = hit?.highlight ?? {};
  // Keys are sorted in the hits object
  const flattened = indexPattern.flattenHit(hit);
  const fields = indexPattern.fields;
  const highlightPairs: Array<[string, unknown]> = [];
  const sourcePairs: Array<[string, unknown]> = [];
  let totalLen = 0;
  let entries = 0;
  const maxEntries = getServices().uiSettings.get(MAX_DOC_FIELDS_DISPLAYED);
  Object.keys(flattened).forEach((key) => {
    if (totalLen > 1000 || entries === maxEntries) {
      return;
    }
    const displayKey = fields.getByName ? fields.getByName(key)?.displayName : undefined;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    const val = indexPattern.formatField(hit, key);

    if (typeof val === 'string') {
      totalLen += Number(displayKey?.length);
      totalLen += Number(val?.length);
    }

    if (displayKey) {
      if (fieldsToShow.includes(displayKey)) {
        pairs.push([displayKey, val]);
      }
    } else {
      pairs.push([key, val]);
    }
    entries++;
  });
  return <TemplateComponent defPairs={[...highlightPairs, ...sourcePairs]} />;
};

export const formatTopLevelObject = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>,
  indexPattern: IndexPattern
) => {
  const highlights = row.highlight ?? {};
  const highlightPairs: Array<[string, unknown]> = [];
  const sourcePairs: Array<[string, unknown]> = [];
  const sorted = Object.entries(fields).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  sorted.forEach(([key, values]) => {
    const field = indexPattern.getFieldByName(key);
    const displayKey = fields.getByName ? fields.getByName(key)?.displayName : undefined;
    const formatter = field
      ? indexPattern.getFormatterForField(field)
      : { convert: (v: string, ...rest: unknown[]) => String(v) };
    if (!values.map) return;
    const formatted = values
      .map((val: unknown) =>
        formatter.convert(val, 'html', {
          field,
          hit: row,
          indexPattern,
        })
      )
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    pairs.push([displayKey ? displayKey : key, formatted]);
  });
  const maxEntries = getServices().uiSettings.get(MAX_DOC_FIELDS_DISPLAYED);
  return <TemplateComponent defPairs={[...highlightPairs, ...sourcePairs].slice(0, maxEntries)} />;
};
