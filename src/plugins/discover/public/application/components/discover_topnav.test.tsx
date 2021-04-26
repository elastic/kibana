/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { DiscoverServices } from '../../build_services';
import { savedSearchMock } from '../../__mocks__/saved_search';
import { dataPluginMock } from '../../../../data/public/mocks';
import { createFilterManagerMock } from '../../../../data/public/query/filter_manager/filter_manager.mock';
import { uiSettingsMock as mockUiSettings } from '../../__mocks__/ui_settings';
import { IndexPatternAttributes } from '../../../../data/common/index_patterns';
import { SavedObject } from '../../../../../core/types';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu } from '../../../../navigation/public';
import { ISearchSource, Query } from '../../../../data/common';

function getProps(): DiscoverTopNavProps {
  const services = ({
    navigation: {
      ui: { TopNavMenu },
    },
    capabilities: {
      discover: {
        save: true,
      },
      advancedSettings: {
        save: true,
      },
    },
    uiSettings: mockUiSettings,
  } as unknown) as DiscoverServices;
  const indexPattern = indexPatternMock;
  return {
    indexPattern: indexPatternMock,
    opts: {
      config: mockUiSettings,
      data: dataPluginMock.createStartContract(),
      filterManager: createFilterManagerMock(),
      indexPatternList: (indexPattern as unknown) as Array<SavedObject<IndexPatternAttributes>>,
      navigateTo: jest.fn(),
      sampleSize: 10,
      savedSearch: savedSearchMock,
      services,
      timefield: indexPattern.timeFieldName || '',
    },
    query: {} as Query,
    savedQuery: '',
    updateQuery: jest.fn(),
    onOpenInspector: jest.fn(),
    searchSource: {} as ISearchSource,
  };
}

describe('Discover topnav component', () => {
  test('setHeaderActionMenu was called', () => {
    const props = getProps();
    mountWithIntl(<DiscoverTopNav {...props} />);
    expect(props.opts.setHeaderActionMenu).toHaveBeenCalled();
  });
});
