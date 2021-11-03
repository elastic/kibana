/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import { setVersion } from './set_version';

describe('setVersion', () => {
  test('sets version, if one is not set', () => {
    const history: Pick<History, 'location' | 'replace'> = {
      location: {
        hash: '',
        search: '',
        pathname: '/',
        state: {},
      },
      replace: jest.fn(),
    };
    setVersion(history, '1.2.3');

    expect(history.replace).toHaveBeenCalledTimes(1);
    expect(history.replace).toHaveBeenCalledWith('/?_v=1.2.3');
  });

  test('overwrites, if version already set to a different value', () => {
    const history: Pick<History, 'location' | 'replace'> = {
      location: {
        hash: '/view/dashboards',
        search: 'a=b&_v=7.16.6',
        pathname: '/foo/bar',
        state: {},
      },
      replace: jest.fn(),
    };
    setVersion(history, '8.0.0');

    expect(history.replace).toHaveBeenCalledTimes(1);
    expect(history.replace).toHaveBeenCalledWith('/foo/bar?a=b&_v=8.0.0#/view/dashboards');
  });

  test('does nothing, if version already set to correct value', () => {
    const history: Pick<History, 'location' | 'replace'> = {
      location: {
        hash: '/view/dashboards',
        search: 'a=b&_v=8.0.0',
        pathname: '/foo/bar',
        state: {},
      },
      replace: jest.fn(),
    };
    setVersion(history, '8.0.0');

    expect(history.replace).toHaveBeenCalledTimes(0);
  });
});
