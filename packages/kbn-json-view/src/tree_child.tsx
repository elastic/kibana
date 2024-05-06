/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { Label } from './label';

const FIELDS_COLORS = {
  dark: '#a68ac5',
  light: '#765b96',
};

const VALUES_COLORS = {
  dark: '#d97797',
  light: '#a34a68',
};

export const TreeChild = ({
  node,
  i,
  isRootElement,
  parent,
}: {
  node: EsHitRecord;
  i: number;
  isRootElement?: boolean;
  parent?: unknown;
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleExpandElement = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const itemLabelProps = {
    node,
    i,
    isRootElement,
    parent,
  };

  const { euiTheme } = useEuiTheme();

  return (
    <>
      <>
        <EuiIcon
          type={expanded ? 'minus' : 'plus'}
          color="primary"
          role="button"
          onClick={handleExpandElement}
        />
        <Label {...itemLabelProps} />
      </>
      {expanded &&
        node &&
        Object.keys(node).map((subel, n) => {
          return (
            <div
              key={n}
              css={css`
                font-family: ${euiTheme.font.familyCode};
              `}
            >
              {typeof node[subel] !== 'object' || node[subel] == null ? (
                <>
                  <span
                    css={css`
                      color: ${FIELDS_COLORS.light};
                    `}
                  >{`${subel}`}</span>{' '}
                  :
                  <span
                    css={css`
                      color: ${VALUES_COLORS.light};
                    `}
                  >{`${node[subel]}`}</span>
                </>
              ) : (
                <TreeChild i={i} node={node[subel]} parent={subel} />
              )}
            </div>
          );
        })}
    </>
  );
};
