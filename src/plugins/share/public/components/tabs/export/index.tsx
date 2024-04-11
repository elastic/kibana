/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { ExportContent } from './export_content';
import { useShareTabsContext } from '../../context';

type IExportTab = IModalTabDeclaration;

const ExportTabContent = () => {
  const { shareMenuItems, objectType, isDirty, onClose } = useShareTabsContext()!;

  const aggregateReportTypes = shareMenuItems;

  return (
    <ExportContent
      {...{
        objectType,
        isDirty,
        onClose,
        aggregateReportTypes,
      }}
    />
  );
};

export const exportTab: IExportTab = {
  id: 'export',
  name: i18n.translate('share.contextMenu.exportCodeTab', {
    defaultMessage: 'Export',
  }),
  content: ExportTabContent,
};
