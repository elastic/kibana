/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  const {
    updateContentAt,
    saveSnapshotAndRemoveContent,
    getData,
    getSingleContentData,
  } = useMultiContentContext<T>();

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
