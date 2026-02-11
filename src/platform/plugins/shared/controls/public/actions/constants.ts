/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ACTION_CLEAR_CONTROL = 'clearControl';
export const ACTION_PIN_CONTROL = 'pinControl';
export const ACTION_EDIT_CONTROL_DISPLAY_SETTINGS = 'editControlDisplaySettings';

export const OPTIONS_LIST_ACTION = 'addOptionsList';
export const RANGE_SLIDER_ACTION = 'addRangeSlider';

export const ADD_PANEL_CONTROL_GROUP = {
  id: 'controls',
  order: 950,
  getDisplayName: () =>
    i18n.translate('controls.panelGroup.displayName', {
      defaultMessage: 'Controls',
    }),
};
