/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { GridStackEngine } from 'gridstack';
import { Props as GridItemProps, GridItem } from './grid_item';

interface Props {
  columns?: number;
  guttersize?: number;
  gridData?: GridItemProps[];
  isNested?: boolean;
}

const CELL_HEIGHT = 32;

export const Grid: FC<Props> = ({
  gridData = [],
  columns = 48,
  guttersize = 4,
  isNested = false,
}) => {
  const [items, setItems] = useState<GridItemProps[]>(gridData);
  const engine = useMemo(
    () =>
      new GridStackEngine({
        column: columns,
        float: false,
        nodes: items,
      }),
    [columns, items]
  );

  useEffect(() => {});

  engine.compact();

  let maxRow = 1;
  engine.nodes.forEach(({ y, h }) => {
    const endRow = y + 1 + h;
    if (maxRow < endRow) {
      maxRow = endRow;
    }
  });

  console.log({ engine });

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
          calc((${100}% - ${guttersize * (columns - 1)}px) / ${columns})
        );
        grid-template-rows: repeat(${maxRow}, ${CELL_HEIGHT}px);
        justify-items: stretch;
      `,
    [guttersize, columns, maxRow]
  );

  return (
    <div id="dashboardGrid" className="dshGrid" css={gridStyles}>
      {engine.nodes.map((item) =>
        item.subGrid ? (
          <GridItem
            {...item}
            render={() => (
              <Grid
                columns={columns}
                guttersize={guttersize}
                gridData={item.subGrid.children}
                isNested
              />
            )}
          />
        ) : (
          <GridItem {...item} isInGroup={isNested} />
        )
      )}
    </div>
  );
};
