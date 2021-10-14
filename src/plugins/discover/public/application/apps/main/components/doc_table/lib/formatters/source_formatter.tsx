/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { escape } from 'lodash';
import { DocTableRow } from '../../components/table_row';
import { shortenDottedString } from '../../../../../../../../../field_formats/common';
import { IndexPattern } from '../../../../../../../../../data/public';
import { getTruncateStyles } from '../../../../../../helpers/truncate_styles';

interface Props {
  defPairs: Array<[string, string]>;
  maxHeight: number;
}

const TemplateComponent = ({ maxHeight, defPairs }: Props) => {
  return (
    <dl className="source" css={getTruncateStyles(maxHeight)}>
      {defPairs.map((pair, idx) => (
        <Fragment key={idx}>
          <dt
            dangerouslySetInnerHTML={{ __html: `${escape(pair[0])}:` }} // eslint-disable-line react/no-danger
          />
          <dd
            dangerouslySetInnerHTML={{ __html: `${pair[1]}` }} // eslint-disable-line react/no-danger
          />{' '}
        </Fragment>
      ))}
    </dl>
  );
};

export const formatSource = ({
  hit,
  indexPattern,
  isShortDots,
  maxHeight,
}: {
  hit: DocTableRow;
  indexPattern: IndexPattern;
  isShortDots: boolean;
  maxHeight: number;
}) => {
  const highlights: Record<string, string[]> = (hit && hit.highlight) || {};
  // TODO: remove index pattern dependency
  const formatted = hit ? indexPattern.formatHit(hit) : {};
  const highlightPairs: Array<[string, string]> = [];
  const sourcePairs: Array<[string, string]> = [];

  Object.keys(formatted).forEach((key) => {
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    const newField = isShortDots ? shortenDottedString(key) : key;
    const val = formatted![key];
    pairs.push([newField as string, val]);
  }, []);

  return <TemplateComponent defPairs={highlightPairs.concat(sourcePairs)} maxHeight={maxHeight} />;
};
