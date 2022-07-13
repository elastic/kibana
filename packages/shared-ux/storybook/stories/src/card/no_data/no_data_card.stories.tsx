/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { NoDataCard as Component, NoDataCardProvider } from '@kbn/shared-ux-card-no-data';

import { NoDataCardStorybookMock } from './mock';
import type { NoDataCardParams } from './mock';

export default {
  title: 'No Data/Card',
  description: 'A solution-specific wrapper around `EuiCard`, to be used on `NoData` page',
};

export const NoDataCard = (params: NoDataCardParams) => {
  return (
    <NoDataCardProvider {...NoDataCardStorybookMock.getServices(params)}>
      <Component {...params} />
    </NoDataCardProvider>
  );
};

NoDataCard.argTypes = NoDataCardStorybookMock.getArgumentTypes();
