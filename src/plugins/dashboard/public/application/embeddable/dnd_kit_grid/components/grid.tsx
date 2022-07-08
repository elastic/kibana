/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { Props as GridItemProps, GridItem } from './grid_item';

interface Props {
  columns?: number;
  guttersize?: number;
  gridData?: GridItemProps[];
}

const CELL_HEIGHT = 32;

export const Grid: FC<Props> = ({ gridData = [], columns = 48, guttersize = 4 }) => {
  const [items, setItems] = useState<GridItemProps[]>(gridData);
  let maxRow = 1;
  items.forEach(({ y, h }) => {
    const endRow = y + 1 + h;
    if (maxRow < endRow) {
      maxRow = endRow;
    }
  });

  const gridStyles = useMemo(
    () =>
      css`
        height: 100%;
        width: 100;
        background-color: pink;
        display: grid;
        gap: ${guttersize}px;
        grid-template-columns: repeat(
          ${columns},
          ${100 / columns}% - ${guttersize * columns + 1}px
        );
        grid-template-rows: repeat(${maxRow}, ${CELL_HEIGHT}px);
        justify-items: stretch;
      `,
    [guttersize, columns, maxRow]
  );

  return (
    <div id="dashboardGrid" className="dshGrid" css={gridStyles}>
      {items.map((item) => (
        <GridItem {...item} />
      ))}
    </div>
  );
};
