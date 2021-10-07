/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource } from 'src/plugins/data/public';
import { getTopNavLinks } from './get_top_nav_links';
import { indexPatternMock } from '../../../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import { DiscoverServices } from '../../../../../build_services';
import { GetStateReturn } from '../../services/discover_state';

const uiSettingsMock = jest.fn<unknown, [string, unknown]>((key) => {
  if (key === 'labs:discover:enable_ui') {
    return true;
  }
});

const getProps = () => {
  const services = {
    capabilities: {
      discover: {
        save: true,
      },
      advancedSettings: {
        save: true,
      },
    },
    uiSettings: {
      get: uiSettingsMock,
    },
  } as unknown as DiscoverServices;

  const state = {} as unknown as GetStateReturn;

  return {
    indexPattern: indexPatternMock,
    navigateTo: jest.fn(),
    onOpenInspector: jest.fn(),
    savedSearch: savedSearchMock,
    services,
    state,
    searchSource: {} as ISearchSource,
    onOpenSavedSearch: () => {},
    onOpenLabs: () => {},
  };
};
const ids = (items: Array<{ id: string }>) => items.map(({ id }) => id);

describe('getTopNavLinks', () => {
  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps();
    props.services.capabilities.discover.save = true;
    expect(ids(getTopNavLinks(props))).toEqual([
      'new',
      'open',
      'share',
      'inspect',
      'labs',
      'options',
      'save',
    ]);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps();
    props.services.capabilities.discover.save = false;
    expect(ids(getTopNavLinks(props))).toEqual([
      'new',
      'open',
      'share',
      'inspect',
      'labs',
      'options',
    ]);
  });

  test('should not show labs button if ui disabled', () => {
    const props = getProps();
    uiSettingsMock.mockImplementation((id) => {
      if (id === 'labs:discover:enable_ui') {
        return false;
      }
    });
    expect(ids(getTopNavLinks(props))).toEqual([
      'new',
      'open',
      'share',
      'inspect',
      'options',
      'save',
    ]);
  });
});
