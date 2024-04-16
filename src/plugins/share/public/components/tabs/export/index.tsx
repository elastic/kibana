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
import { useShareTabsContext, type ShareMenuItem } from '../../context';

type IExportTab = IModalTabDeclaration;

const ExportTabContent = () => {
  const { shareMenuItems, objectType, isDirty, onClose } = useShareTabsContext()!;

  return (
    <ExportContent
      objectType={objectType}
      isDirty={isDirty}
      onClose={onClose}
      aggregateReportTypes={shareMenuItems as unknown as ShareMenuItem[]}
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
