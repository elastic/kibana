/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InitialTabStateService, type InitialTabState } from './initial_tab_state_service';

const allLogsSpec: InitialTabState = {
  dataViewSpec: { id: 'all-logs', title: 'logs*' },
};

describe('InitialTabStateService', () => {
  it('returns undefined when nothing has been captured', () => {
    expect(new InitialTabStateService().consume()).toBeUndefined();
  });

  it('returns the captured state', () => {
    const service = new InitialTabStateService();

    service.capture(allLogsSpec);

    expect(service.consume()).toEqual(allLogsSpec);
  });

  it('clears the captured state once consumed, so it applies only to the tab it was captured for', () => {
    const service = new InitialTabStateService();

    service.capture(allLogsSpec);

    expect(service.consume()).toEqual(allLogsSpec);
    expect(service.consume()).toBeUndefined();
  });

  it('supersedes a state that was never consumed', () => {
    const service = new InitialTabStateService();
    const nextState: InitialTabState = { defaultState: { interval: 'auto' } };

    service.capture(allLogsSpec);
    service.capture(nextState);

    expect(service.consume()).toEqual(nextState);
  });

  it('clears the captured state when a navigation supplies none', () => {
    const service = new InitialTabStateService();

    service.capture(allLogsSpec);
    service.capture(undefined);

    expect(service.consume()).toBeUndefined();
  });
});
