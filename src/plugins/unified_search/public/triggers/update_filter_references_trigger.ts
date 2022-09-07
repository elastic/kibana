/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export const UPDATE_FILTER_REFERENCES_TRIGGER = 'UPDATE_FILTER_REFERENCES_TRIGGER';
export const updateFilterReferencesTrigger: Trigger = {
  id: UPDATE_FILTER_REFERENCES_TRIGGER,
  title: i18n.translate('unifiedSearch.triggers.updateFilterReferencesTrigger', {
    defaultMessage: 'Update filter references',
  }),
  description: i18n.translate('unifiedSearch.triggers.updateFilterReferencesTriggerDescription', {
    defaultMessage: 'Update filter references',
  }),
};
