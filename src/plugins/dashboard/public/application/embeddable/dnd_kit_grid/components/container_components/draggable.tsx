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

  const columnSize = useRef(100);
  useEffect(() => {
    const gridEl = document.getElementById('gridContainer');
    const cols = window.getComputedStyle(gridEl).gridTemplateColumns;
    columnSize.current = parseFloat(cols.split(' ')[0].slice(0, -2));
  }, []);

  const w = 3;
  const h = 3;
  const columnStart = Math.ceil(position.x / columnSize.current) + 1;
  const columnEnd = columnStart + w;
  const rowStart = Math.ceil(position.y / 26) + 1;
  const rowEnd = rowStart + h;

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
