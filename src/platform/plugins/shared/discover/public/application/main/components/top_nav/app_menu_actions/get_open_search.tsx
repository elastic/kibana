/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AppMenuActionId } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { AppMenuItemType, AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import { OpenSearchPanel } from '../open_search_panel';

export const getOpenSearchAppMenuItem = ({
  onOpenSavedSearch,
}: {
  onOpenSavedSearch: (savedSearchId: string) => void;
}): AppMenuItemType => {
  return {
    id: AppMenuActionId.open,
    order: 2,
    label: i18n.translate('discover.localMenu.openDiscoverSessionTitle', {
      defaultMessage: 'Open',
    }),
    iconType: 'folderOpen',
    testId: 'discoverOpenButton',
    run: (params?: AppMenuRunActionParams) => {
      const onFinishAction = params?.context?.onFinishAction as () => void;
      return <OpenSearchPanel onClose={onFinishAction} onOpenSavedSearch={onOpenSavedSearch} />;
    },
  };
};
