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

  const { shareMenuItems, allowEmbed, objectType, onClose } = shareContext;

  const tabs = [linkTab, allowEmbed ? embedTab : null].filter(Boolean);

  shareMenuItems.forEach(({ shareMenuItem, panel }) => {
    tabs.push({
      ...shareMenuItem,
      id: panel.id.toString(),
      modalActionBtn: {
        id: 'export',
        dataTestSubj: 'generateExportButton',
        formattedMessageId: 'share.link.generateExportButton',
        defaultMessage: 'Generate export',
      },
      reducer({ state, action }) {
        switch (action.type) {
          default:
            return state;
        }
      },
    });
  });

  return (
    <TabbedModal
      modalTitle={`Share this ${objectType}`}
      onClose={onClose}
      tabs={tabs}
      selectedTabId="link"
    />
  );
};
