/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const PENDING_CHANGES_REMINDER = i18n.translate(
  'alertsUIShared.filtersGroup.pendingChanges',
  {
    defaultMessage: 'Save pending changes',
  }
);

export const EDIT_CONTROLS = i18n.translate(
  'alertsUIShared.filtersGroup.contextMenu.editControls',
  {
    defaultMessage: 'Edit Controls',
  }
);

export const ADD_CONTROLS = i18n.translate('alertsUIShared.filtersGroup.contextMenu.addControls', {
  defaultMessage: 'Add Controls',
});

export const SAVE_CONTROLS = i18n.translate(
  'alertsUIShared.filtersGroup.contextMenu.saveControls',
  {
    defaultMessage: 'Save Controls',
  }
);

export const DISCARD_CHANGES = i18n.translate('alertsUIShared.filtersGroup.discardChanges', {
  defaultMessage: 'Discard Changes',
});

export const FILTER_GROUP_MENU = i18n.translate('alertsUIShared.filterGroup.groupMenuTitle', {
  defaultMessage: 'Filter group menu',
});

export const FILTER_GROUP_BANNER_TITLE = i18n.translate(
  'alertsUIShared.filterGroup.filtersChangedBanner',
  {
    defaultMessage: 'Filter Controls have changed',
  }
);

export const FILTER_GROUP_BANNER_MESSAGE = i18n.translate(
  'alertsUIShared.filterGroup.filtersChangedTitle',
  {
    defaultMessage: `New filter controls on this page are different from what you have previously saved. You can either save the changes or discard them.
       Navigating away will automatically discard these changes`,
  }
);

export const CONTEXT_MENU_RESET_TOOLTIP = i18n.translate(
  'alertsUIShared.filterGroup.contextMenu.resetTooltip',
  {
    defaultMessage: 'Reset Controls to factory settings',
  }
);

export const CONTEXT_MENU_RESET = i18n.translate('alertsUIShared.filterGroup.contextMenu.reset', {
  defaultMessage: 'Reset Controls',
});

export const SAVE_CHANGES = i18n.translate('alertsUIShared.filtersGroup.contextMenu.saveChanges', {
  defaultMessage: 'Save Changes',
});

export const REVERT_CHANGES = i18n.translate(
  'alertsUIShared.filtersGroup.contextMenu.revertChanges',
  {
    defaultMessage: 'Revert Changes',
  }
);

export const ADD_CONTROLS_MAX_LIMIT = i18n.translate(
  'alertsUIShared.filtersGroup.contextMenu.addControls.maxLimit',
  {
    defaultMessage: 'Maximum of 4 controls can be added.',
  }
);

export const URL_PARAM_ARRAY_EXCEPTION_MSG = i18n.translate(
  'alertsUIShared.filtersGroup.urlParam.arrayError',
  {
    defaultMessage: 'Page filter URL Params must be an array',
  }
);
