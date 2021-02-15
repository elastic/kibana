/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '.';

export const VALUE_CLICK_TRIGGER = 'VALUE_CLICK_TRIGGER';
export const valueClickTrigger: Trigger<'VALUE_CLICK_TRIGGER'> = {
  id: VALUE_CLICK_TRIGGER,
  title: i18n.translate('uiActions.triggers.valueClickTitle', {
    defaultMessage: 'Single click',
  }),
  description: i18n.translate('uiActions.triggers.valueClickDescription', {
    defaultMessage: 'A data point click on the visualization',
  }),
};
