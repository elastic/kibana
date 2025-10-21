/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import { css } from '@emotion/react';

import type { DropResult } from '@elastic/eui';
import { EuiDragDropContext, EuiDroppable } from '@elastic/eui';

const DROPPABLE_ID = 'unifiedTabsOrder';

const droppableCss = css`
  display: flex;
  align-items: center;
  wrap: no-wrap;
`;

interface DroppableWrapperProps {
  children: React.ReactNode;
  enableDragAndDrop: boolean;
  onDragEnd: (result: DropResult) => void;
}

export const OptionalDroppable: FC<DroppableWrapperProps> = ({
  children,
  enableDragAndDrop,
  onDragEnd,
}) => {
  if (!enableDragAndDrop) {
    return <div css={droppableCss}>{children}</div>;
  }

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId={DROPPABLE_ID} direction="horizontal" css={droppableCss} grow>
        {() => <>{children}</>}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
