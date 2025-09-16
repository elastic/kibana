/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import React, { Fragment } from 'react';
import type { IndexPattern } from 'src/plugins/data/common';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../../../../../common';
import { getServices } from '../../../../../../kibana_services';
import { formatHit } from '../../../../../helpers/format_hit';

import './row_formatter.scss';
import { formatFieldValue } from '../../../../../helpers/format_value';

interface Props {
  defPairs: Array<[string, string]>;
}
const TemplateComponent = ({ defPairs }: Props) => {
  return (
    <dl className={'source truncate-by-height'}>
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
  row: estypes.SearchHit,
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
    if (!values.map) return;
    const formatted = values
      .map((val: unknown) => formatFieldValue(val, row, indexPattern, field))
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    pairs.push([displayKey ? displayKey : key, formatted]);
  });
  const maxEntries = getServices().uiSettings.get(MAX_DOC_FIELDS_DISPLAYED);
  return <TemplateComponent defPairs={[...highlightPairs, ...sourcePairs].slice(0, maxEntries)} />;
};
