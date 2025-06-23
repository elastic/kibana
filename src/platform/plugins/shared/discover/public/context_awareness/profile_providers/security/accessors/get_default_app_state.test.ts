/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDefaultSecuritySolutionAppStateGetter } from './get_default_app_state';

describe('createDefaultSecuritySolutionAppStateGetter', () => {
  it('should return default app state without security solution specific columns and breakdown field if there is no index match', () => {
    const getDefaultAppState = createDefaultSecuritySolutionAppStateGetter();

    const params = {
      dataView: {
        getIndexPattern: () => 'logs-*',
      },
    };

    const prevAppState = { someKey: 'someValue' };
    const prevAppStateGetter = () => prevAppState;
    // @ts-expect-error - params should be compatible with the expected type
    const appState = getDefaultAppState(prevAppStateGetter)(params);

    expect(Object.keys(appState)).toMatchObject(['someKey']);
  });

  it('should return default app state with security solution specific columns and breakdown field if there is index match', () => {
    const getDefaultAppState = createDefaultSecuritySolutionAppStateGetter();

    const params = {
      dataView: {
        getIndexPattern: () => '.alerts-security.alerts-*',
      },
    };

    const prevAppState = { someKey: 'someValue' };
    const prevAppStateGetter = () => prevAppState;
    // @ts-expect-error - params should be compatible with the expected type
    const appState = getDefaultAppState(prevAppStateGetter)(params);

    expect(appState).toEqual({
      ...prevAppState,
      breakdownField: 'kibana.alert.workflow_status',
      columns: [
        { name: '@timestamp', width: 218 },
        { name: 'kibana.alert.workflow_status' },
        { name: 'message', width: 360 },
        { name: 'event.category' },
        { name: 'event.action' },
        { name: 'host.name' },
        { name: 'source.ip' },
        { name: 'destination.ip' },
        { name: 'user.name' },
      ],
    });
  });
});
