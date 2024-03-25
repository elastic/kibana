/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';
import { TabbedModal } from '@kbn/shared-ux-tabbed-modal';

import { ShareTabsContext, useShareTabsContext, type IShareContext } from './context';
import { linkTab, embedTab } from './tabs';

export const ShareMenuV2: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
  return (
    <ShareTabsContext.Provider value={shareContext}>
      <ShareMenuTabs />
    </ShareTabsContext.Provider>
  );
};

// this file is intended to replace share_context_menu
export const ShareMenuTabs = () => {
  const shareContext = useShareTabsContext();

  if (!shareContext) {
    return null;
  }

  const { allowEmbed, objectType, onClose, shareMenuItems } = shareContext;

  const tabs = [linkTab, allowEmbed ? embedTab : null].filter(Boolean);
  if (shareMenuItems) {
    shareMenuItems.forEach(({ shareMenuItem, panel }) => {
      tabs.push({
        id: panel.id.toString(),
        name: shareMenuItem.name,
        // @ts-ignore
        content: () => panel.content,
      });
    });
  }

  return (
    <TabbedModal
      // @ts-ignore
      tabs={tabs}
      modalWidth={483}
      onClose={onClose}
      modalTitle={`Share this ${objectType}`}
      defaultSelectedTabId="link"
    />
  );
};
