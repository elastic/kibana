/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldValueOptionType, SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TableText } from '../';
import { UISession } from '../../types';
import { getStatusText } from '../status';

export const getStatusFilter: (tableData: UISession[]) => SearchFilterConfig = (tableData) => ({
  type: 'field_value_selection',
  name: i18n.translate('data.mgmt.searchSessions.search.filterStatus', {
    defaultMessage: 'Status',
  }),
  field: 'status',
  multiSelect: 'or',
  options: tableData.reduce((options: FieldValueOptionType[], session) => {
    const { status: statusType } = session;
    const existingOption = options.find((o) => o.value === statusType);
    if (!existingOption) {
      const view = <TableText>{getStatusText(session.status)}</TableText>;
      return [...options, { value: statusType, view }];
    }

    return options;
  }, []),
});
