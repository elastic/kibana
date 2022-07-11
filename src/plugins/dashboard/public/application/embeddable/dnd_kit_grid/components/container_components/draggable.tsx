/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { css } from '@emotion/react';
import { PanelState } from '../../types';
interface Props {
  id: string;
  position: { x: number; y: number };
  element?: React.ElementType | string;
  children?: JSX.Element | JSX.Element[];
}

export const Draggable = ({ id, position, element, children }: Props) => {
  const Element = element || 'div';
  const { attributes, listeners, setNodeRef, isDragging, node } = useDraggable({
    id,
  });

  // const transform = {
  //   transform: `translate(${x}px, ${y}px)`,
  // };

  const w = 3;
  const h = 3;

  const columnStart = Math.ceil(position.x / 30) + 1;
  const columnEnd = columnStart + w;
  const rowStart = Math.ceil(position.y / 26) + 1;
  const rowEnd = rowStart + h;
  // const columnStart = x + 1;
  // const columnEnd = columnStart + w;
  // const rowStart = x + 1;
  // const rowEnd = rowStart + w;

  // console.log({ top, initPosition, deltaPosition, columnStart, columnEnd, rowStart, rowEnd });

  console.log({ position });

  // const positionStyles = useMemo(
  //   () => css`
  //     grid-column-start: ${columnStart};
  //     grid-column-end: ${columnEnd};
  //     grid-row-start: ${rowStart};
  //     grid-row-end: ${rowEnd};
  //     opacity: ${isDragging ? '0.5' : ''};
  //   `,
  //   [columnStart, columnEnd, rowStart, rowEnd, isDragging]
  // );

  // const positionStyles = useMemo(
  //   () => css`
  // position: fixed;
  // left: ${deltaPosition.x === 0 ? initPosition.x : deltaPosition.x}px;
  // top: ${deltaPosition.y === 0 ? initPosition.y : deltaPosition.y}px;
  // opacity: ${isDragging ? '0.5' : ''};
  //   `,
  //   [deltaPosition.x, deltaPosition.y, initPosition.x, initPosition.y, isDragging]
  // );

  const style = {
    opacity: isDragging ? '0.5' : '',
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    // ...transform,
  };

  return (
    <Element
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      // css={positionStyles}
    >
      {children}
    </Element>
  );
};
