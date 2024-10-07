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
import React from 'react';
import { TableText } from '..';
import { UISession } from '../../types';
import { getStatusText } from '../status';
import { SearchSessionStatus } from '../../../../../../common/search/session/status';

export const getStatusFilter: (tableData: UISession[]) => SearchFilterConfig = (tableData) => ({
  type: 'field_value_selection',
  name: i18n.translate('data.mgmt.searchSessions.search.filterStatus', {
    defaultMessage: 'Status',
  }),
  field: 'status',
  multiSelect: 'or',
  options: Object.values(SearchSessionStatus)
    .sort()
    .map((status) => ({ value: status, view: <TableText>{getStatusText(status)}</TableText> })),
});
