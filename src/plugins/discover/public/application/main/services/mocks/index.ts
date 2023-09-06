/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { createBrowserHistory, History } from 'history';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverStateContainer } from '../discover_state';

const getMockHistory = () => {
  const history: History = createBrowserHistory();
  history.push('/');
  return history;
};

function getStateContainer({ dataView, history }: { dataView?: DataView; history?: History } = {}) {
  const discoverServiceMock = createDiscoverServicesMock();
  const savedSearch = savedSearchMock;
  discoverServiceMock.savedSearch.getNew = jest.fn().mockReturnValue(savedSearch);
  const currentHistory = history ?? getMockHistory();

  const stateContainer = getDiscoverStateContainer({
    services: discoverServiceMock,
    history: currentHistory,
  });
  stateContainer.savedSearchState.set(savedSearch);
  stateContainer.appState.getState = jest.fn(() => ({
    rowsPerPage: 250,
  }));
  if (dataView) {
    stateContainer.internalState.transitions.setDataView(dataView);
  }
  return stateContainer;
}

export const getMockDiscoverStateContainer = ({ history }: { history?: History }) => {
  return getStateContainer({ history });
};
