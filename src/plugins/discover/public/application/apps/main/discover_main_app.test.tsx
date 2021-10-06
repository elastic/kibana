/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { DiscoverMainApp } from './discover_main_app';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { createSearchSessionMock } from '../../../__mocks__/search_session';
import { SavedObject } from '../../../../../../core/types';
import { IndexPatternAttributes } from '../../../../../data/common';
import { setHeaderActionMenuMounter } from '../../../kibana_services';
import { findTestSubject } from '@elastic/eui/lib/test';

setHeaderActionMenuMounter(jest.fn());

describe('DiscoverMainApp', () => {
  test('renders', () => {
    const { history } = createSearchSessionMock();
    const indexPatternList = [indexPatternMock].map((ip) => {
      return { ...ip, ...{ attributes: { title: ip.title } } };
    }) as unknown as Array<SavedObject<IndexPatternAttributes>>;

    const props = {
      indexPatternList,
      services: discoverServiceMock,
      savedSearch: savedSearchMock,
      navigateTo: jest.fn(),
      history,
    };

    const component = mountWithIntl(<DiscoverMainApp {...props} />);

    expect(findTestSubject(component, 'indexPattern-switch-link').text()).toBe(
      indexPatternMock.title
    );
  });
});
