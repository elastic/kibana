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
import { linkTab, embedTab, ExportContent } from './tabs';

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

  const { allowEmbed, objectType, onClose, shareMenuItems, isDirty, objectId, theme } =
    shareContext;
  console.log(shareMenuItems);
  const tabs = [linkTab];
  if (shareMenuItems) {
    shareMenuItems.forEach((shareMenuItem) => {
      console.log(shareMenuItem);
      const { getJobParams, createReportingJob, helpText, reportType, reportingAPIClient } =
        shareMenuItem;
      const exportContent = (
        // @ts-ignore showing undefined but there is a check to make sure share menu items exist
        <ExportContent
          {...{
            getJobParams,
            createReportingJob,
            helpText,
            reportType,
            isDirty,
            objectType,
            objectId,
            theme,
            onClose,
            reportingAPIClient,
          }}
        />
      );
      tabs.push({
        id: shareMenuItem.tabType,
        name: shareMenuItem.tabType,
        content: exportContent,
      });
    });
  }

  if (allowEmbed) {
    tabs.push(embedTab);
  }

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
