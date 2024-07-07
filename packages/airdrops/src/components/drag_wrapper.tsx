/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type DragEvent, useState, useEffect, useRef } from 'react';
import { TRANSFER_DATA_TYPE } from '../constants';

import { useAirdrop } from '../services';
import type { Airdrop, AirdropContent } from '../types';

export interface Props<T = unknown> {
  content: AirdropContent<T>;
  children: ({ isLoadingContent }: { isLoadingContent: boolean }) => React.ReactNode;
}

export function DragWrapper<T>({ content, children }: Props<T>) {
  const { setIsDragging } = useAirdrop();
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [asyncContent, setAsyncContent] = useState<T | undefined>();
  const idx = useRef(0);

  const onDragStart = (e: DragEvent) => {
    setIsDragging(true);

    const airdrop: Airdrop<T> = {
      id: content.id,
      app: content.app,
      content: content.get ? content.get() : asyncContent!,
    };
    const serializedData = JSON.stringify(airdrop);
    e.dataTransfer.setData(TRANSFER_DATA_TYPE, serializedData);
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!content.get && !content.getAsync) {
      throw new Error('AirdropContent must have either a get or getAsync method');
    }

    if (content.getAsync) {
      const currentIdx = idx.current;
      setIsLoadingContent(true);

      content.getAsync().then((value) => {
        if (currentIdx !== idx.current) return;
        setIsLoadingContent(false);
        setAsyncContent(value);
      });
    }
  }, [content]);

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
      {children({ isLoadingContent })}
    </div>
  );
}
