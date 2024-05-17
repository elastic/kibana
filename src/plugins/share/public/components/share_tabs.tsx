/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TabbedModal } from '@kbn/shared-ux-tabbed-modal';
import React, { type FC } from 'react';

import { type IShareContext, ShareTabsContext, useShareTabsContext } from './context';
import { embedTab, exportTab, linkTab } from './tabs';

export const ShareMenu: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
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

  const { allowEmbed, objectTypeMeta, onClose, shareMenuItems, anchorElement } = shareContext;

  const tabs = [];

  tabs.push(linkTab);

  if (shareMenuItems.length > 0) {
    tabs.push(exportTab);
  }

  if (allowEmbed) {
    tabs.push(embedTab);
  }

  return (
    <TabbedModal
      tabs={tabs}
      modalWidth={498}
      onClose={onClose}
      modalTitle={objectTypeMeta.title}
      defaultSelectedTabId="link"
      anchorElement={anchorElement}
    />
  );
};
