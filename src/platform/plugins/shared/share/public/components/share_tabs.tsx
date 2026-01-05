/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useMemo, type FC } from 'react';
import { TabbedModal, type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { ShareProvider, useShareContext, type IShareContext } from './context';
import { linkTab, embedTab } from './tabs';

export const ShareMenu: FC<{ shareContext: IShareContext }> = ({ shareContext }) => {
  return (
    <ShareProvider {...{ shareContext }}>
      <ShareMenuTabs />
    </ShareProvider>
  );
};

// this file is intended to replace share_context_menu
export const ShareMenuTabs = () => {
  const shareContext = useShareContext();

  const { objectTypeMeta, onClose, shareMenuItems, anchorElement, sharingData } = shareContext;

  const tabs = useMemo(() => {
    const tabList: Array<IModalTabDeclaration<any>> = [];

    // Do not show the link tab if the share url is disabled
    if (!objectTypeMeta?.config.link?.disabled) {
      tabList.push(linkTab);
    }

    // Embed is disabled in the serverless offering, hence the need to check if the embed tab should be shown
    if (
      shareMenuItems.some(({ shareType }) => shareType === 'embed') &&
      !objectTypeMeta?.config?.embed?.disabled
    ) {
      tabList.push(embedTab);
    }
    return tabList;
  }, [objectTypeMeta, shareMenuItems]);

  const showAccessModeContainer = Boolean(sharingData?.accessModeContainer);

  return Boolean(tabs.length) ? (
    <TabbedModal
      tabs={tabs}
      modalWidth={498}
      onClose={onClose}
      modalTitle={objectTypeMeta.title}
      defaultSelectedTabId={tabs[0].id}
      anchorElement={anchorElement}
      data-test-subj="shareContextModal"
      aboveTabsContent={
        showAccessModeContainer ? (sharingData?.accessModeContainer as ReactNode) : null
      }
      outsideClickCloses
    />
  ) : null;
};
