/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { I18nStart } from '@kbn/core/public';
import React, { type PropsWithChildren, createContext, useContext } from 'react';

import type { ShareConfigs, ShareTypes, ShowShareMenuOptions } from '../../types';

export interface IShareContext extends Omit<ShowShareMenuOptions, 'onClose'> {
  onClose: () => void;
  shareMenuItems: ShareConfigs[];
  theme: ThemeServiceSetup;
  i18n: I18nStart;
}

const ShareTabsContext = createContext<IShareContext | null>(null);

export const ShareMenuProvider = ({
  shareContext,
  children,
}: PropsWithChildren<{ shareContext: IShareContext }>) => {
  return <ShareTabsContext.Provider value={shareContext}>{children}</ShareTabsContext.Provider>;
};

export const useShareContext = () => {
  const context = useContext(ShareTabsContext);

  if (!context) {
    throw new Error(
      'Failed to call `useShareContext` because the context from ShareMenuProvider is missing. Ensure the component or React root is wrapped with ShareMenuProvider'
    );
  }

  return context;
};

export const useShareTabsContext = <
  T extends Exclude<ShareTypes, 'legacy'>,
  G extends T extends 'integration' ? string : never
>(
  shareType: T,
  groupId?: G
) => {
  const context = useShareContext();

  const { shareMenuItems, objectTypeMeta, ...rest } = context;

  // the integration share type can have multiple implementations
  const shareTypeImplementations: T extends 'integration'
    ? Array<Extract<ShareConfigs, { shareType: T; groupId?: G }>>
    : Extract<ShareConfigs, { shareType: T }> = (
    shareType === 'integration' ? Array.prototype.filter : Array.prototype.find
  ).call(shareMenuItems, (item) => item.shareType === shareType && item?.groupId === groupId);

  return {
    ...rest,
    objectTypeMeta: {
      ...objectTypeMeta,
      config: objectTypeMeta.config[shareType],
    },
    shareMenuItems: shareTypeImplementations,
  };
};
