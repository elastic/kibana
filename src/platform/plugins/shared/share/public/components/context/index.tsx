/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, createContext, useContext } from 'react';

import type { ShareConfigs, ShareTypes, ShowShareMenuOptions } from '../../types';

export interface IShareContext extends Omit<ShowShareMenuOptions, 'onClose'> {
  onClose: () => void;
  shareMenuItems: ShareConfigs[];
}

const ShareContext = createContext<IShareContext | null>(null);

export const ShareProvider = ({
  shareContext,
  children,
}: PropsWithChildren<{ shareContext: IShareContext }>) => {
  return <ShareContext.Provider value={shareContext}>{children}</ShareContext.Provider>;
};

export const useShareContext = () => {
  const context = useContext(ShareContext);

  if (!context) {
    throw new Error(
      'Failed to call `useShareContext` because the context from ShareMenuProvider is missing. Ensure the component or React root is wrapped with ShareMenuProvider'
    );
  }

  return context;
};

export const useShareTypeContext = <
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
  ).call(
    shareMenuItems,
    (item) => item.shareType === shareType && item?.groupId === (groupId ?? item?.groupId)
  );

  type ObjectTypeMetaConfig = IShareContext['objectTypeMeta']['config'];

  const shareTypeObjectMeta: Omit<ObjectTypeMetaConfig, 'config'> & {
    config: T extends 'integration'
      ? NonNullable<NonNullable<ObjectTypeMetaConfig>['integration']>[G] | undefined
      : Exclude<NonNullable<ObjectTypeMetaConfig>, 'integration'>[T];
  } = {
    ...objectTypeMeta,
    // @ts-expect-error -- this is a workaround for the type system
    config:
      shareType === 'integration'
        ? groupId
          ? objectTypeMeta.config?.integration?.[groupId]
          : {}
        : objectTypeMeta.config?.[shareType],
  };

  return {
    ...rest,
    objectTypeMeta: shareTypeObjectMeta,
    shareMenuItems: shareTypeImplementations,
  };
};
