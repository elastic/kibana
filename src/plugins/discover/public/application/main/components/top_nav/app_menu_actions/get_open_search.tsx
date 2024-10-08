/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppMenuActionId, AppMenuActionType, AppMenuAction } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { OpenSearchPanel } from '../open_search_panel';

export const getOpenSearchAppMenuItem = (): AppMenuAction => {
  return {
    id: AppMenuActionId.open,
    type: AppMenuActionType.secondary, // TODO: convert to primary
    controlProps: {
      label: i18n.translate('discover.localMenu.openTitle', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('discover.localMenu.openSavedSearchDescription', {
        defaultMessage: 'Open Saved Search',
      }),
      testId: 'discoverOpenButton',
      onClick: ({ getDiscoverParams, onFinishAction }) => {
        const { onOpenSavedSearch } = getDiscoverParams();
        return <OpenSearchPanel onClose={onFinishAction} onOpenSavedSearch={onOpenSavedSearch} />;
      },
    },
  };
};
