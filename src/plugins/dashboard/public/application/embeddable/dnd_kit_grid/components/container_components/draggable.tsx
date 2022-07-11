/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { css } from '@emotion/react';
interface Props {
  id: string;
  position: { x: number; y: number };
  element?: React.ElementType | string;
  children?: JSX.Element | JSX.Element[];
}

export const Draggable = ({ id, position, element, children }: Props) => {
  const Element = element || 'div';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });
  const columnSize = useRef<number>(50);

  const updateColumnWidth = () => {
    const gridEl = document.getElementById('gridContainer');
    if (gridEl) {
      const cols = window.getComputedStyle(gridEl).gridTemplateColumns;
      columnSize.current = parseFloat(cols.split('px')[0]);
    }
  };

  window.addEventListener('resize', () => {
    updateColumnWidth();
  });

  useEffect(() => {
    updateColumnWidth();
  }, []);

  const { columnStart, columnEnd, rowStart, rowEnd } = useMemo(() => {
    const w = 3;
    const h = 3;
    const startC = Math.ceil(position.x / columnSize.current) + 1;
    const startR = Math.ceil(position.y / 26) + 1;

    return {
      columnStart: startC,
      columnEnd: startC + w,
      rowStart: startR,
      rowEnd: startR + h,
    };
  }, [position.x, position.y]);

  const positionStyles = useMemo(
    () => css`
      grid-column-start: ${columnStart};
      grid-column-end: ${columnEnd};
      grid-row-start: ${rowStart};
      grid-row-end: ${rowEnd};
      opacity: ${isDragging ? '0.5' : ''};
    `,
    [columnStart, columnEnd, rowStart, rowEnd, isDragging]
  );

  return (
    <Element
      ref={setNodeRef}
      // style={style}
      {...listeners}
      {...attributes}
      css={positionStyles}
    >
      {children}
    </Element>
  );
};
