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

  const tabs = [linkTab];
  if (shareMenuItems) {
    shareMenuItems
      // need to filter out the null shareMenuItem from Lens and just use the reporting image modal that includes CSV for Lens
      .filter((item) => item !== null)
      .forEach(({ shareMenuItem, panel }) => {
        tabs.push({
          id: panel.id.toString(),
          name: shareMenuItem.name,
          // @ts-ignore
          content: () => panel.content,
        });
      });
  }

  if (allowEmbed) tabs.push(embedTab);

  return (
    <TabbedModal
      tabs={tabs}
      modalWidth={483}
      onClose={onClose}
      modalTitle={`Share this ${objectType}`}
      defaultSelectedTabId="link"
    />
  );
};
