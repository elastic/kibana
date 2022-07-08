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
import { StyledGridItem } from './styled_grid_item';

export interface Props {
  columns?: number;
  guttersize?: number;
  gridData?: GridItemProps[];
  isNested?: boolean;
}

const CELL_HEIGHT = 26;

export const Grid: FC<Props> = ({
  gridData = [],
  columns = 48,
  guttersize = 4,
  isNested = false,
}) => {
  const engineRef = useRef<GridStackEngine>();
  const [items, setItems] = useState<GridItemProps[]>(gridData);
  // const engine = useMemo(
  //   () =>
  //     new GridStackEngine({
  //       column: columns,
  //       float: false,
  //       nodes: items.map((item) => ({ ...item, maxH: item.isCollapsed ? 1 : undefined })),
  //     }),
  //   [columns, items]
  // );

  // useEffect(() => {
  //   engineRef.current =
  //     engineRef.current ||
  //     new GridStackEngine({
  //       column: columns,
  //       float: false,
  //       nodes: items.map((item) => ({ ...item, maxH: item.isCollapsed ? 1 : undefined })),
  //     });
  // }, [columns, items]);

  // engine.compact();

  // console.log({ engine });
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
        width: 100%;
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
    <div className="dshGrid dshLayout--editing" css={gridStyles}>
      {items.map((item) =>
        item.subGrid ? (
          <StyledGridItem
            {...item}
            render={() => (
              <Grid
                id={item.id}
                columns={item.w}
                guttersize={guttersize}
                gridData={item.subGrid.children}
                isNested
              />
            )}
            updateItem={(itemId: string, partialItem: Partial<GridItemProps>) => {
              let removedIndex = -1;
              const itemToUpdate = items.find(({ id }, index) => {
                const idMatched = itemId === id;
                if (idMatched) {
                  removedIndex = index;
                }
                return idMatched;
              });

              if (removedIndex >= 0) {
                items.splice(removedIndex, 1);
                setItems([...items, { ...itemToUpdate, ...partialItem } as GridItemProps]);
              }
            }}
          />
        ) : (
          <StyledGridItem {...item} isInGroup={isNested} />
        )
      )}
    </div>
  );
};
