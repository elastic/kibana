/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconBackgroundTask } from '@kbn/background-search';
import { AppMenuActionId, AppMenuActionType, type AppMenuItemPrimary } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';

export const getBackgroundSearchFlyout = ({
  onClick,
}: {
  onClick: () => void;
}): AppMenuItemPrimary => {
  return {
    id: AppMenuActionId.backgroundsearch,
    type: AppMenuActionType.primary,
    controlProps: {
      label: i18n.translate('discover.localMenu.localMenu.openBackgroundSearchFlyoutTitle', {
        defaultMessage: 'Background searches',
      }),
      // TODO: Replace when the backgroundTask icon is available in EUI
      iconType: EuiIconBackgroundTask,
      testId: 'openBackgroundSearchFlyoutButton',
      onClick,
    },
  };
};
