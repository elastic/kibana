/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export const UPDATE_USED_DATA_VIEWS_TRIGGER = 'UPDATE_USED_DATA_VIEWS_TRIGGER';
export const updateUsedDataViewsTrigger: Trigger = {
  id: UPDATE_USED_DATA_VIEWS_TRIGGER,
  title: i18n.translate('unifiedSearch.triggers.updateUsedDataViewsTrigger', {
    defaultMessage: 'Update used data views trigger',
  }),
  description: i18n.translate('unifiedSearch.triggers.updateUsedDataViewsTriggerDescription', {
    defaultMessage: 'When kibana filter is applied. Could be a single value or a range filter.',
  }),
};
