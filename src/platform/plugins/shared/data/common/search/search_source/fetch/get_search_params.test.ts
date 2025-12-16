/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UI_SETTINGS } from '../../../constants';
import type { GetConfigFn } from '../../../types';
import { getSearchParamsFromRequest, getEsPreference } from './get_search_params';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { ProjectRoutingAccess, type ICPSManager } from '@kbn/cps-utils';

function getConfigStub(config: any = {}): GetConfigFn {
  return (key) => config[key];
}

describe('getSearchParams', () => {
  test('includes custom preference', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const searchParams = getSearchParamsFromRequest({ index: 'abc', body: {} }, { getConfig });
    expect(searchParams.preference).toBe('aaa');
  });

  test('extracts track total hits from request', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const searchParams = getSearchParamsFromRequest(
      {
        index: 'abc',
        query: [{ query: '123', language: 'kql' }],
        track_total_hits: true,
      },
      { getConfig }
    );
    expect(searchParams.index).toBe('abc');
    expect(searchParams.track_total_hits).toBe(true);
    expect(searchParams.query).toStrictEqual([{ query: '123', language: 'kql' }]);
  });

  test('extracts track total hits from body', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const searchParams = getSearchParamsFromRequest(
      {
        body: {
          query: { bool: { filter: [] } },
          track_total_hits: false,
          size: 500,
        },
        index: 'abc',
      },
      { getConfig }
    );
    expect(searchParams.index).toBe('abc');
    expect(searchParams.track_total_hits).toBe(false);
    expect(searchParams.query).toMatchInlineSnapshot(`undefined`);
  });

  test('sets expand_wildcards=all if data view has allowHidden=true', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const index = createStubDataView({
      spec: {
        allowHidden: true,
      },
    });
    const searchParams = getSearchParamsFromRequest(
      {
        index,
        query: [{ query: '123', language: 'kql' }],
        track_total_hits: true,
      },
      { getConfig }
    );
    expect(searchParams).toHaveProperty('expand_wildcards', 'all');
  });

  test('does not set expand_wildcards if data view has allowHidden=false', () => {
    const getConfig = getConfigStub({
      [UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE]: 'custom',
      [UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE]: 'aaa',
    });
    const index = createStubDataView({
      spec: {
        allowHidden: false,
      },
    });
    const searchParams = getSearchParamsFromRequest(
      {
        index,
        query: [{ query: '123', language: 'kql' }],
        track_total_hits: true,
      },
      { getConfig }
    );
    expect(searchParams).not.toHaveProperty('expand_wildcards', 'all');
  });

  describe('getEsPreference', () => {
    const mockConfigGet = jest.fn();

    beforeEach(() => {
      mockConfigGet.mockClear();
    });

    test('returns the session ID if set to sessionId', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'sessionId';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet, 'my_session_id');
      expect(preference).toBe('my_session_id');
    });

    test('returns the custom preference if set to custom', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'custom';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet);
      expect(preference).toBe('foobar');
    });

    test('returns undefined if set to none', () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE) return 'none';
        if (key === UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE) return 'foobar';
      });
      const preference = getEsPreference(mockConfigGet);
      expect(preference).toBe(undefined);
    });
  });

  describe('project_routing CPS fallback', () => {
    const createMockCPSManager = (
      projectRouting: string | undefined,
      access: ProjectRoutingAccess = ProjectRoutingAccess.EDITABLE
    ): ICPSManager =>
      ({
        getProjectRouting: jest.fn().mockReturnValue(projectRouting),
        getProjectPickerAccess: jest.fn().mockReturnValue(access),
      } as unknown as ICPSManager);

    test('injects global project_routing when not explicitly set', () => {
      const getConfig = getConfigStub({});
      const getCPSManager = jest.fn().mockReturnValue(createMockCPSManager('_alias:_origin'));

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: {} },
        { getConfig, getCPSManager }
      );

      expect((searchParams.body as any).project_routing).toBe('_alias:_origin');
    });

    test('does not override explicit project_routing value', () => {
      const getConfig = getConfigStub({});
      const getCPSManager = jest.fn().mockReturnValue(createMockCPSManager('_alias:_origin'));

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: { project_routing: '_alias:*' } },
        { getConfig, getCPSManager }
      );

      expect((searchParams.body as any).project_routing).toBe('_alias:*');
    });

    test('does not inject when CPS is disabled', () => {
      const getConfig = getConfigStub({});
      const getCPSManager = jest
        .fn()
        .mockReturnValue(createMockCPSManager('_alias:_origin', ProjectRoutingAccess.DISABLED));

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: {} },
        { getConfig, getCPSManager }
      );

      expect((searchParams.body as any).project_routing).toBeUndefined();
    });

    test('does not inject when getCPSManager is not provided', () => {
      const getConfig = getConfigStub({});

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: {} },
        { getConfig }
      );

      expect((searchParams.body as any).project_routing).toBeUndefined();
    });

    test('does not inject when CPS manager returns undefined', () => {
      const getConfig = getConfigStub({});
      const getCPSManager = jest.fn().mockReturnValue(undefined);

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: {} },
        { getConfig, getCPSManager }
      );

      expect((searchParams.body as any).project_routing).toBeUndefined();
    });

    test('does not inject when global project_routing is undefined', () => {
      const getConfig = getConfigStub({});
      const getCPSManager = jest.fn().mockReturnValue(createMockCPSManager(undefined));

      const searchParams = getSearchParamsFromRequest(
        { index: 'abc', body: {} },
        { getConfig, getCPSManager }
      );

      expect((searchParams.body as any).project_routing).toBeUndefined();
    });
  });
});
