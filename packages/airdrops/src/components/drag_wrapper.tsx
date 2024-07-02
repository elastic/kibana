/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type DragEvent } from 'react';
import { TRANSFER_DATA_TYPE } from '../constants';

import { useAirdrop } from '../services';
import type { Airdrop, AirdropContent } from '../types';

export interface Props<T = Record<string, unknown>> {
  content: AirdropContent<T>;
  children: React.ReactNode;
}

export function DragWrapper<T>({ content, children }: Props<T>) {
  const { setIsDragging } = useAirdrop();

  const onDragStart = (e: DragEvent) => {
    setIsDragging(true);
    const airdrop: Airdrop<T> = {
      id: content.id,
      app: content.app,
      content: content.get(),
    };
    const serializedData = JSON.stringify(airdrop);
    e.dataTransfer.setData(TRANSFER_DATA_TYPE, serializedData);
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
}
