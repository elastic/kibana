/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { Fragment } from 'react';
import type { IndexPattern } from 'src/plugins/data/common';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../../common';
import { getServices } from '../../../kibana_services';
import { formatHit } from '../../../utils/format_hit';

import './row_formatter.scss';

interface Props {
  defPairs: Array<[string, string]>;
}
const TemplateComponent = ({ defPairs }: Props) => {
  return (
    <dl className={'source dscTruncateByHeight'}>
      {defPairs.map((pair, idx) => (
        <Fragment key={idx}>
          <dt>{pair[0]}:</dt>
          <dd
            className="rowFormatter__value"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: pair[1] }}
          />{' '}
        </Fragment>
      ))}
    </dl>
  );
};

export const formatRow = (
  hit: estypes.SearchHit,
  indexPattern: IndexPattern,
  fieldsToShow: string[]
) => {
  const pairs = formatHit(hit, indexPattern, fieldsToShow);
  return <TemplateComponent defPairs={pairs} />;
};

export const formatTopLevelObject = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: Record<string, any>,
  indexPattern: IndexPattern
) => {
  const highlights = row.highlight ?? {};
  const highlightPairs: Array<[string, string]> = [];
  const sourcePairs: Array<[string, string]> = [];
  const sorted = Object.entries(fields).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  sorted.forEach(([key, values]) => {
    const field = indexPattern.getFieldByName(key);
    const displayKey = fields.getByName ? fields.getByName(key)?.displayName : undefined;
    const formatter = field
      ? indexPattern.getFormatterForField(field)
      : { convert: (v: unknown, ...rest: unknown[]) => String(v) };
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
