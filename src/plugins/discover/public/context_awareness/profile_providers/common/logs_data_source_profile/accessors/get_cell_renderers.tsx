/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { getLogLevelBadgeCell } from '@kbn/discover-contextual-components';
import React, { createContext, useContext } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import { EuiFlyout } from '@elastic/eui';
import { getSummaryColumn } from '../../../../../components/data_types/logs/summary_column';
import {
  LOG_LEVEL_FIELDS,
  SERVICE_NAME_FIELDS,
} from '../../../../../../common/data_types/logs/constants';
import { getServiceNameCell } from '../../../../../components/data_types/logs/service_name_cell';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const getCellRenderers: DataSourceProfileProvider['profile']['getCellRenderers'] =
  (prev) => (params) => ({
    ...prev(params),
    ...LOG_LEVEL_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field]: getLogLevelBadgeCell(field),
        [`${field}.keyword`]: getLogLevelBadgeCell(`${field}.keyword`),
      }),
      {}
    ),
    ...SERVICE_NAME_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field]: getServiceNameCell(field, params),
        [`${field}.keyword`]: getServiceNameCell(`${field}.keyword`, params),
      }),
      {}
    ),
    [SOURCE_COLUMN]: getSummaryColumn(params),
    'error.message': function ErrorMessage(props) {
      const errorMessage = getFieldValue(props.row, 'error.message');
      const test = useContext(testContext);
      return (
        <>
          {test}: {errorMessage}
        </>
      );
    },
  });

const testContext = createContext('test');

export const getRenderAppWrapper: DataSourceProfileProvider<{
  foo?: string;
}>['profile']['getRenderAppWrapper'] =
  (PrevWrapper, { context }) =>
  ({ children }) => {
    return (
      <testContext.Provider value={context.foo ?? ''}>
        <PrevWrapper>{children}</PrevWrapper>
      </testContext.Provider>
    );
  };

export const getRenderDocViewerFlyout: DataSourceProfileProvider['profile']['getRenderDocViewerFlyout'] =
  () => (props) => {
    return (
      <EuiFlyout onClose={props.onClose}>
        <pre>{JSON.stringify(props.hit, null, 2)}</pre>
      </EuiFlyout>
    );
  };
