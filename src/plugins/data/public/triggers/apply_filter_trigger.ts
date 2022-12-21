/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export const APPLY_FILTER_TRIGGER = 'FILTER_TRIGGER';
export const applyFilterTrigger: Trigger = {
  id: APPLY_FILTER_TRIGGER,
  title: i18n.translate('data.triggers.applyFilterTitle', {
    defaultMessage: 'Apply filter',
  }),
  description: i18n.translate('data.triggers.applyFilterDescription', {
    defaultMessage: 'When kibana filter is applied. Could be a single value or a range filter.',
  }),
};
