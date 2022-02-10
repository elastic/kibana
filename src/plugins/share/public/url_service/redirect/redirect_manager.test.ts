/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RedirectManager } from './redirect_manager';
import { MockUrlService } from '../../mocks';
import { MigrateFunction } from 'src/plugins/kibana_utils/common';

const setup = () => {
  const url = new MockUrlService();
  const locator = url.locators.create({
    id: 'TEST_LOCATOR',
    getLocation: async () => {
      return {
        app: '',
        path: '',
        state: {},
      };
    },
    migrations: {
      '0.0.2': (({ num }: { num: number }) => ({ num: num * 2 })) as unknown as MigrateFunction,
    },
  });
  const manager = new RedirectManager({
    url,
  });

  return {
    url,
    locator,
    manager,
  };
};

describe('on page mount', () => {
  test('execute locator "navigate" method', async () => {
    const { locator, manager } = setup();
    const spy = jest.spyOn(locator, 'navigate');
    const search = `l=TEST_LOCATOR&v=0.0.3&p=${encodeURIComponent(JSON.stringify({}))}`;

    expect(spy).toHaveBeenCalledTimes(0);
    manager.onMount({
      search,
      hash: '',
      pathname: '',
      state: null,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('passes arguments provided in URL to locator "navigate" method', async () => {
    const { locator, manager } = setup();
    const spy = jest.spyOn(locator, 'navigate');
    const search = `l=TEST_LOCATOR&v=0.0.3&p=${encodeURIComponent(
      JSON.stringify({
        foo: 'bar',
      })
    )}`;

    manager.onMount({
      search,
      hash: '',
      pathname: '',
      state: null,
    });
    expect(spy).toHaveBeenCalledWith(
      {
        foo: 'bar',
      },
      { replace: true }
    );
  });

  test('migrates parameters on-the-fly to the latest version', async () => {
    const { locator, manager } = setup();
    const spy = jest.spyOn(locator, 'navigate');
    const search = `l=TEST_LOCATOR&v=0.0.1&p=${encodeURIComponent(
      JSON.stringify({
        num: 1,
      })
    )}`;

    manager.onMount({
      search,
      hash: '',
      pathname: '',
      state: null,
    });
    expect(spy).toHaveBeenCalledWith(
      {
        num: 2,
      },
      { replace: true }
    );
  });

  test('throws if locator does not exist', async () => {
    const { manager } = setup();
    const search = `l=TEST_LOCATOR_WHICH_DOES_NOT_EXIST&v=0.0.3&p=${encodeURIComponent(
      JSON.stringify({})
    )}`;

    expect(() =>
      manager.onMount({
        search,
        hash: '',
        pathname: '',
        state: null,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Locator [ID = TEST_LOCATOR_WHICH_DOES_NOT_EXIST] does not exist."`
    );
  });
});
