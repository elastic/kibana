/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppMenuActionId, AppMenuActionType, AppMenuActionPrimary } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { OpenSearchPanel } from '../open_search_panel';

export const getOpenSearchAppMenuItem = ({
  onOpenSavedSearch,
}: {
  onOpenSavedSearch: (savedSearchId: string) => void;
}): AppMenuActionPrimary => {
  return {
    id: AppMenuActionId.open,
    type: AppMenuActionType.primary,
    controlProps: {
      label: i18n.translate('discover.localMenu.openTitle', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('discover.localMenu.openSavedSearchDescription', {
        defaultMessage: 'Open Saved Search',
      }),
      iconType: 'folderOpen',
      testId: 'discoverOpenButton',
      onClick: ({ onFinishAction }) => {
        return <OpenSearchPanel onClose={onFinishAction} onOpenSavedSearch={onOpenSavedSearch} />;
      },
    },
  };
};
