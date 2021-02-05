/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '.';

export const SELECT_RANGE_TRIGGER = 'SELECT_RANGE_TRIGGER';
export const selectRangeTrigger: Trigger<'SELECT_RANGE_TRIGGER'> = {
  id: SELECT_RANGE_TRIGGER,
  title: i18n.translate('uiActions.triggers.selectRangeTitle', {
    defaultMessage: 'Range selection',
  }),
  description: i18n.translate('uiActions.triggers.selectRangeDescription', {
    defaultMessage: 'A range of values on the visualization',
  }),
};
