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
import { CsvContent } from './csv_content';
export { CsvContent } from './csv_content';

type ICsvTab = IModalTabDeclaration<{
  setCreatingReportJob: boolean;
  copyUrl: string;
}>;

const CsvTabContent: ICsvTab['content'] = () => {
  const { isDirty, apiClient, objectType, toasts, theme, onClose, csvType, uiSettings } =
    useShareTabsContext()!;

  return (
    <CsvContent
      {...{ isDirty, apiClient, objectType, toasts, theme, onClose, csvType, uiSettings }}
    />
  );
};

export const csvTab: ICsvTab = {
  id: 'export',
  name: i18n.translate('share.contextMenu.exportsTab', {
    defaultMessage: 'Export',
  }),
  description: (
    <FormattedMessage
      id="share.dashboard.export.description"
      defaultMessage="Share a direct link to this search."
    />
  ),
  content: CsvTabContent,
};
