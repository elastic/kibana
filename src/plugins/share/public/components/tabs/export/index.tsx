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

const exportTabReducer: IExportTab['reducer'] = (state, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const ExportTabContent: NonNullable<IExportTab['content']> = ({ state, dispatch }) => {
  const { shareMenuItems, objectType, isDirty, objectId, theme, onClose } = useShareTabsContext()!;

  return shareMenuItems.map((shareMenuItem, index) => {
    const { getJobParams, createReportingJob, helpText, reportType, reportingAPIClient } =
      shareMenuItem;

    return (
      // @ts-ignore props show undefined because of v1 share design modal needed the props to be optional for congruency with Canvas
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
        key={index}
      />
    );
  });
};

export const exportTab: IExportTab = {
  id: 'export',
  name: i18n.translate('share.contextMenu.exportCodeTab', {
    defaultMessage: 'Export',
  }),
  reducer: exportTabReducer,
  content: ExportTabContent,
};
