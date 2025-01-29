/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { UISession } from '../../types';

export const getAppFilter: (tableData: UISession[]) => SearchFilterConfig = (tableData) => ({
  type: 'field_value_selection',
  name: i18n.translate('data.mgmt.searchSessions.search.filterApp', {
    defaultMessage: 'App',
  }),
  field: 'appId',
  multiSelect: 'or',
  options: [...new Set(tableData.map((data) => data.appId ?? 'unknown'))]
    .sort()
    .map((appId) => ({ value: appId, view: capitalize(appId) })),
});
