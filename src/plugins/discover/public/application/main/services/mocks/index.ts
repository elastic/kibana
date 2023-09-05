/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createBrowserHistory, History } from 'history';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverStateContainer } from '../discover_state';

const discoverServiceMock = createDiscoverServicesMock();

const getMockHistory = () => {
  const history: History = createBrowserHistory();
  history.push('/');
  return history;
};

export const getMockDiscoverStateContainer = ({ history }: { history?: History }) => {
  return getDiscoverStateContainer({
    services: discoverServiceMock,
    history: history ?? getMockHistory(),
  });
};
