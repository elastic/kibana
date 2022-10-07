/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataViewListItem, DataView } from '@kbn/data-views-plugin/public';

interface DiscoverAlertContext {
  isManagementPage: boolean;
  initialAdHocDataViewList: DataViewListItem[];
  addAdHocDataView?: (dataView: DataView) => void;
}

/**
 * Initial context will stay for management page.
 * When open alert flyout from Discover, context will be updated with valid props.
 */
const initialContext: DiscoverAlertContext = {
  isManagementPage: true,
  initialAdHocDataViewList: [],
};

const context = React.createContext(initialContext);

export const DiscoverAlertContextProvider = context.Provider;

export const useDiscoverAlertContext = () => React.useContext<DiscoverAlertContext>(context);
