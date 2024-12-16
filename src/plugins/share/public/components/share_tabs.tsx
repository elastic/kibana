/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC } from 'react';
import { TabbedModal, type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';

import { ShareMenuProvider, useShareTabsContext, type IShareContext } from './context';
import { linkTab, embedTab, exportTab } from './tabs';

export const ShareMenu: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
  return (
    <ShareMenuProvider {...{ shareContext }}>
      <ShareMenuTabs />
    </ShareMenuProvider>
  );
};

// this file is intended to replace share_context_menu
export const ShareMenuTabs = () => {
  const shareContext = useShareTabsContext();

  const { allowEmbed, objectTypeMeta, onClose, shareMenuItems, anchorElement } = shareContext;

  const tabs: Array<IModalTabDeclaration<any>> = [linkTab];

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
      data-test-subj="shareContextModal"
    />
  );
};
