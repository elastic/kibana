/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { useShareTabsContext } from '../../context';

type IExportTab = IModalTabDeclaration<{
  exportType: string;
}>;


const ExportTabContent: IExportTab['content'] = () => {
  const { shareMenuItems } = useShareTabsContext()!;
  return  shareMenuItems.forEach(({ shareMenuItem, panel }) => 
    panel.content
  );
};

export const exportTab: IExportTab = {
  id: 'export',
  name: i18n.translate('share.contextMenu.permalinksTab', {
    defaultMessage: 'Export',
  }),
  description: (
    <FormattedMessage
      id="share.dashboard.link.description"
      defaultMessage="Share a direct link to this search."
    />
  ),
  content: ExportTabContent,
};
