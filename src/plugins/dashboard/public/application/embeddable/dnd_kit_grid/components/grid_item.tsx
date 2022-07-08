/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { css } from '@emotion/react';

export interface Props {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  render?: () => JSX.Element;
  isInGroup?: boolean;
}

export const GridItem: FC<Props> = ({ id, x, y, w, h, title, render, isInGroup }) => {
  const gridItemStyles = useMemo(
    () => css`
      color: white;
      background-color: ${isInGroup ? 'green' : 'blue'};
      grid-column-start: ${x + 1};
      grid-column-end: ${x + 1 + w};
      grid-row-start: ${y + 1};
      grid-row-end: ${y + 1 + h};
    `,
    [x, y, w, h, isInGroup]
  );

  const contentStyles = css`
    width: 100%;
    height: 100%;
    padding: 4px;
  `;

  // console.log({ id, x, y, w, h });

  return (
    <div id={id} className="dshGridItem" css={gridItemStyles}>
      <div className="dshGridItem__content" css={contentStyles}>
        <h2>{title ?? '[No title]'}</h2>
        {render ? render() : null}
      </div>
    </div>
  );
};
