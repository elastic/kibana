/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

  const { objectTypeMeta, onClose, shareMenuItems, anchorElement, toasts, isDirty } = shareContext;

  const tabs: Array<IModalTabDeclaration<any>> = [];

  // Do not show the link tab if the share url is disabled
  if (!objectTypeMeta?.config.link?.disabled) {
    tabs.push(linkTab);
  }

  // Embed is disabled in the serverless offering, hence the need to check if the embed tab should be shown
  if (
    shareMenuItems.some(({ shareType }) => shareType === 'embed') &&
    !objectTypeMeta?.config?.embed?.disabled
  ) {
    tabs.push(embedTab);
  }

  /**
   * If there is only one tab and the link is configured to allow copying the link without showing the modal,
   * we will copy the link to the clipboard and show a success toast on copying the share link for object.
   */
  if (
    !isDirty &&
    tabs.length === 1 &&
    !objectTypeMeta?.config.link?.disabled &&
    objectTypeMeta.config?.link?.attachToAnchorIfIsolate &&
    objectTypeMeta.config?.link?.delegatedShareUrlHandler
  ) {
    void (async function () {
      const shareableUrl = await objectTypeMeta.config?.link?.delegatedShareUrlHandler!();
      copyToClipboard(shareableUrl!);
      toasts.addSuccess({
        title: i18n.translate('share.shareContextMenu.copyLinkSuccess', {
          defaultMessage: 'Link copied to clipboard',
        }),
      });
    })();

    return null;
  }

  return Boolean(tabs.length) ? (
    <TabbedModal
      tabs={tabs}
      modalWidth={498}
      onClose={onClose}
      modalTitle={objectTypeMeta.title}
      defaultSelectedTabId={tabs[0].id}
      anchorElement={anchorElement}
      data-test-subj="shareContextModal"
    />
  ) : null;
};
