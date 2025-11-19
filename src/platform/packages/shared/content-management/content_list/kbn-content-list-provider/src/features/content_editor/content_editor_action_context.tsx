/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, type FC, type PropsWithChildren } from 'react';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';

/**
 * The content editor action function type.
 * Opens the content editor flyout and returns a close function.
 */
export type OpenContentEditorFn = (args: OpenContentEditorParams) => () => void;

/**
 * Context for sharing the content editor opener function.
 *
 * Due to circular dependency constraints between `ContentEditorKibanaProvider`
 * (needs UserProfilesProvider) and `ContentListProvider` (provides UserProfilesProvider),
 * automatic wrapping is not possible.
 *
 * Consumers who want content editor functionality should:
 * 1. Wrap their content with `ContentEditorKibanaProvider` inside the ContentListProvider's children.
 * 2. Inside that wrapper, use `ContentEditorActionProvider` to share the opener with descendants.
 */
const ContentEditorActionContext = createContext<OpenContentEditorFn | null>(null);

/**
 * Provider component that shares a content editor opener function via context.
 *
 * Use this inside `ContentEditorKibanaProvider` to make `useContentEditorOpener`
 * available to descendant components.
 *
 * @example
 * ```tsx
 * <ContentListProvider ...>
 *   <ContentEditorKibanaProvider core={coreServices}>
 *     <ContentEditorActionProvider>
 *       <ContentListTable />
 *     </ContentEditorActionProvider>
 *   </ContentEditorKibanaProvider>
 * </ContentListProvider>
 * ```
 */
export const ContentEditorActionProvider: FC<PropsWithChildren> = ({ children }) => {
  // Lazy import to avoid issues when ContentEditorKibanaProvider isn't in tree.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useOpenContentEditor } = require('@kbn/content-management-content-editor');
  const openContentEditor = useOpenContentEditor();

  return (
    <ContentEditorActionContext.Provider value={openContentEditor}>
      {children}
    </ContentEditorActionContext.Provider>
  );
};

/**
 * Hook to access the content editor opener function.
 * Returns `null` if the provider is not in the tree.
 */
export const useContentEditorOpener = (): OpenContentEditorFn | null => {
  return useContext(ContentEditorActionContext);
};
