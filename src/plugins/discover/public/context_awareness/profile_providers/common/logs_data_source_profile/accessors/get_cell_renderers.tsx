/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import { LOG_LEVEL_FIELDS } from '../../../../../../common/data_types/logs/constants';
import { getLogLevelBadgeCell } from '../../../../../components/data_types/logs/log_level_badge_cell';
import type { DataSourceProfileProvider } from '../../../../profiles';

export const getCellRenderers: DataSourceProfileProvider['profile']['getCellRenderers'] =
  (prev) => () => ({
    ...prev(),
    ...LOG_LEVEL_FIELDS.reduce(
      (acc, field) => ({
        ...acc,
        [field]: getLogLevelBadgeCell(field),
        [`${field}.keyword`]: getLogLevelBadgeCell(`${field}.keyword`),
      }),
      {}
    ),
    'error.message': function ErrorMessage(params) {
      const errorMessage = getFieldValue(params.row, 'error.message');
      const test = useContext(testContext);
      return (
        <>
          {test}: {errorMessage}
        </>
      );
    },
  });

const testContext = createContext('test');

export const getAppWrapper: DataSourceProfileProvider['profile']['getAppWrapper'] =
  (PrevWrapper) =>
  ({ children }) => {
    return (
      <testContext.Provider value="test-override">
        <PrevWrapper>{children}</PrevWrapper>
      </testContext.Provider>
    );
  };
