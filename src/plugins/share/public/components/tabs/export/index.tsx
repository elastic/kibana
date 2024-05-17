/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import React from 'react';
import { type ShareMenuItemV2, useShareTabsContext } from '../../context';
import { ExportContent } from './export_content';

type IExportTab = IModalTabDeclaration;

const ExportTabContent = () => {
  const { shareMenuItems, objectType, isDirty, onClose } = useShareTabsContext()!;

  return (
    <ExportContent
      objectType={objectType}
      isDirty={isDirty}
      onClose={onClose}
      // we are guaranteed that shareMenuItems will be a ShareMenuItem V2 variant
      aggregateReportTypes={shareMenuItems as unknown as ShareMenuItemV2[]}
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
