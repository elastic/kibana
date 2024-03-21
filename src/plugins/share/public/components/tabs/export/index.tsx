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
import { ExportContent } from './export_content';
import { useShareTabsContext } from '../../context';
export { ExportContent } from './export_content';

type IExportTab = IModalTabDeclaration<{
  setCreatingReportJob: boolean;
  selectedRadio: AllowedImageExportType;
  isMounted: () => boolean;
  usePrintLayout: boolean;
  copyUrl: string;
}>;

type AllowedImageExportType = 'pngV2' | 'printablePdfV2';

const ExportTabContent: IExportTab['content'] = () => {
  const { isDirty, apiClient, objectType, toasts, theme, onClose } = useShareTabsContext()!;

  return <ExportContent {...{ isDirty, apiClient, objectType, toasts, theme, onClose }} />;
};

export const exportTab: IExportTab = {
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
  content: ExportTabContent,
};
