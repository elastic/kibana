/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LocatorDefinition } from './types';
import { Locator, LocatorDependencies } from './locator';
import { KibanaLocation } from '../../../public';
import { LocatorGetUrlParams } from '.';
import { decompressFromBase64 } from 'lz-string';

const setup = (
  { baseUrl = 'http://localhost:5601' }: { baseUrl: string } = { baseUrl: 'http://localhost:5601' }
) => {
  const version = '1.2.3';
  const deps: LocatorDependencies = {
    baseUrl,
    version,
    navigate: jest.fn(),
    getUrl: jest.fn(async (location: KibanaLocation, getUrlParams: LocatorGetUrlParams) => {
      return (getUrlParams.absolute ? baseUrl : '') + '/app/' + location.app + location.path;
    }),
  };
  const definition: LocatorDefinition<{ foo?: string; baz?: string }> = {
    id: 'TEST_LOCATOR',
    getLocation: jest.fn(async ({ foo = 'bar', baz = 'qux' }) => {
      return {
        app: 'test_app',
        path: `/foo/${foo}?baz=${baz}`,
        state: {},
      };
    }),
  };
  const locator = new Locator(definition, deps);

  return { baseUrl, version, deps, definition, locator };
};

describe('Locator', () => {
  test('can create a locator', () => {
    const { locator } = setup();

    expect(locator).toBeInstanceOf(Locator);
    expect(locator.definition.id).toBe('TEST_LOCATOR');
  });

  describe('.getLocation()', () => {
    test('returns location as defined in definition', async () => {
      const { locator } = setup();
      const location = await locator.getLocation({});

      expect(location).toEqual({
        app: 'test_app',
        path: '/foo/bar?baz=qux',
        state: {},
      });
    });
  });

  describe('.getUrl()', () => {
    test('returns URL of the location defined in definition', async () => {
      const { locator } = setup();
      const url1 = await locator.getUrl({});
      const url2 = await locator.getUrl({}, { absolute: true });
      const url3 = await locator.getUrl({ foo: 'a', baz: 'b' });
      const url4 = await locator.getUrl({ foo: 'a', baz: 'b' }, { absolute: true });

      expect(url1).toBe('/app/test_app/foo/bar?baz=qux');
      expect(url2).toBe('http://localhost:5601/app/test_app/foo/bar?baz=qux');
      expect(url3).toBe('/app/test_app/foo/a?baz=b');
      expect(url4).toBe('http://localhost:5601/app/test_app/foo/a?baz=b');
    });
  });

  describe('.getRedirectUrl()', () => {
    test('returns URL of the redirect endpoint', async () => {
      const { locator } = setup();
      const url = await locator.getRedirectUrl({ foo: 'a', baz: 'b' });
      const params = new URLSearchParams(url.split('?')[1]);

      expect(params.get('l')).toBe('TEST_LOCATOR');
      expect(params.get('v')).toBe('1.2.3');
      expect(JSON.parse(decompressFromBase64(params.get('lz')!)!)).toMatchObject({
        foo: 'a',
        baz: 'b',
      });
    });

    test('returns URL of the redirect endpoint with custom spaceid', async () => {
      const { locator } = setup();
      const url = await locator.getRedirectUrl(
        { foo: 'a', baz: 'b' },
        { spaceId: 'custom-space-id' }
      );

      expect(url).toBe(
        'http://localhost:5601/s/custom-space-id/app/r?l=TEST_LOCATOR&v=1.2.3&lz=N4IgZg9hIFwghiANCARvAXrNIC%2BQ'
      );
    });

    test('returns URL of the redirect endpoint with replaced spaceid', async () => {
      const { locator } = setup({ baseUrl: 'http://localhost:5601/s/space-id' });
      const url = await locator.getRedirectUrl(
        { foo: 'a', baz: 'b' },
        { spaceId: 'custom-space-id' }
      );

      expect(url).toBe(
        'http://localhost:5601/s/custom-space-id/app/r?l=TEST_LOCATOR&v=1.2.3&lz=N4IgZg9hIFwghiANCARvAXrNIC%2BQ'
      );
    });

    test('returns URL of the redirect endpoint without spaceid', async () => {
      const { locator } = setup({ baseUrl: 'http://localhost:5601/s/space-id' });
      const url = await locator.getRedirectUrl({ foo: 'a', baz: 'b' }, { spaceId: 'default' });

      expect(url).toBe(
        'http://localhost:5601/app/r?l=TEST_LOCATOR&v=1.2.3&lz=N4IgZg9hIFwghiANCARvAXrNIC%2BQ'
      );
    });

    test('returns URL of the redirect endpoint with untouched spaceId', async () => {
      const { locator } = setup({ baseUrl: 'http://localhost:5601/s/space-id' });
      const url = await locator.getRedirectUrl({ foo: 'a', baz: 'b' });

      expect(url).toBe(
        'http://localhost:5601/s/space-id/app/r?l=TEST_LOCATOR&v=1.2.3&lz=N4IgZg9hIFwghiANCARvAXrNIC%2BQ'
      );
    });
  });

  describe('.navigate()', () => {
    test('returns URL of the redirect endpoint', async () => {
      const { locator, deps } = setup();

      expect(deps.navigate).toHaveBeenCalledTimes(0);

      await locator.navigate({ foo: 'a', baz: 'b' });

      expect(deps.navigate).toHaveBeenCalledTimes(1);
      expect(deps.navigate).toHaveBeenCalledWith(
        await locator.getLocation({ foo: 'a', baz: 'b' }),
        { replace: false }
      );

      await locator.navigate({ foo: 'a2', baz: 'b2' }, { replace: true });

      expect(deps.navigate).toHaveBeenCalledTimes(2);
      expect(deps.navigate).toHaveBeenCalledWith(
        await locator.getLocation({ foo: 'a2', baz: 'b2' }),
        { replace: true }
      );
    });
  });
});
