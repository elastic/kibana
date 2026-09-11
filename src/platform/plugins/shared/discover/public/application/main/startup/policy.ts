/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverCustomizationContext } from '../../../customizations';
import { APP_STATE_URL_KEY } from '../../../../common';
import type { InternalStateStore } from '../state_management/redux';
import { type AppStateUrl, cleanupUrlState } from '../state_management/utils/cleanup_url_state';

export const isEsqlTab = ({
  internalState,
  urlStateStorage,
  services,
}: {
  internalState: InternalStateStore;
  urlStateStorage: IKbnUrlStateStorage;
  services: DiscoverServices;
}) => {
  const state = internalState.getState();
  const currentTab = state.tabs.byId[state.tabs.unsafeCurrentId];
  // For a restored tab, the URL query overrides the query stored with the tab.
  const urlQuery = cleanupUrlState(
    urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY),
    services.uiSettings
  )?.query;

  return isOfAggregateQueryType(urlQuery ?? currentTab?.appState.query);
};

export const shouldUseEsqlTabState = ({
  displayMode,
  isByValueEditor,
  discoverSessionId,
  hasInitialLocationState,
  isEsql,
}: {
  displayMode: DiscoverCustomizationContext['displayMode'];
  isByValueEditor: boolean;
  discoverSessionId: string | undefined;
  hasInitialLocationState: boolean;
  isEsql: boolean;
}) =>
  displayMode === 'standalone' &&
  !isByValueEditor &&
  !discoverSessionId &&
  !hasInitialLocationState &&
  isEsql;
