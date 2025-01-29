/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useCallback, createContext, useContext, useRef } from 'react';

import { useMultiContent, HookProps, Content, MultiContent } from './use_multi_content';

const multiContentContext = createContext<MultiContent<any>>({} as MultiContent<any>);

interface Props<T extends object> extends HookProps<T> {
  children: JSX.Element | JSX.Element[];
}

export function MultiContentProvider<T extends object = { [key: string]: any }>({
  defaultValue,
  onChange,
  children,
}: Props<T>) {
  const multiContent = useMultiContent<T>({ defaultValue, onChange });

  return (
    <multiContentContext.Provider value={multiContent}>{children}</multiContentContext.Provider>
  );
}

export const MultiContentConsumer = multiContentContext.Consumer;

export function useMultiContentContext<T extends object = { [key: string]: any }>() {
  const ctx = useContext(multiContentContext);
  if (Object.keys(ctx).length === 0) {
    throw new Error('useMultiContentContext must be used within a <MultiContentProvider />');
  }
  return ctx as MultiContent<T>;
}

/**
 * Hook to declare a new content and get its defaultValue and a handler to update its content
 *
 * @param contentId The content id to be added to the "contents" map
 */
export function useContent<T extends object, K extends keyof T>(contentId: K) {
  const isMounted = useRef(false);
  const defaultValue = useRef<T[K] | undefined>(undefined);
  const { updateContentAt, saveSnapshotAndRemoveContent, getData, getSingleContentData } =
    useMultiContentContext<T>();

  const updateContent = useCallback(
    (content: Content) => {
      updateContentAt(contentId, content);
    },
    [contentId, updateContentAt]
  );

  useEffect(() => {
    return () => {
      // On unmount: save a snapshot of the data and remove content from our contents map
      saveSnapshotAndRemoveContent(contentId);
    };
  }, [contentId, saveSnapshotAndRemoveContent]);

  useEffect(() => {
    if (isMounted.current === false) {
      isMounted.current = true;
    }
  }, []);

  if (isMounted.current === false) {
    // Only read the default value once, on component mount to avoid re-rendering the
    // consumer each time the multi-content validity ("isValid") changes.
    defaultValue.current = getSingleContentData(contentId);
  }

  return {
    defaultValue: defaultValue.current!,
    updateContent,
    getData,
    getSingleContentData,
  };
}
