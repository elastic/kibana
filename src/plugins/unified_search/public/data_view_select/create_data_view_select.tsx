/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React from 'react';

import { IndexPatternsContract as DataViewsContract } from '../../../data/public';
import DataViewSelect, { DataViewSelectProps } from './data_view_select';

// Takes in stateful runtime dependencies and pre-wires them to the component
export function createDataViewSelect(dataViewService: DataViewsContract) {
  return (props: DataViewSelectProps) => (
    <DataViewSelect {...props} dataViewService={dataViewService} />
  );
}
