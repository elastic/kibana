/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, type FC, type DragEvent } from 'react';
import { TRANSFER_DATA_TYPE } from '../constants';

import { useAirdrop } from '../services';

interface Props {
  dataGetter: () => string;
}

export const DragWrapper: FC<Props> = ({ dataGetter, children }) => {
  // const [isDragging, setIsDragging] = useState(false);
  const { setIsDragging } = useAirdrop();

  const onDragStart = (e: DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(TRANSFER_DATA_TYPE, dataGetter());
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      id="draggable"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        cursor: 'grab',
        transform: 'translate(0, 0)', // avoids parent bkg rendering
      }}
    >
      {children}
    </div>
  );
};
