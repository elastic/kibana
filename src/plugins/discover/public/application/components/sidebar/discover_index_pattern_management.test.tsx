/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStubIndexPattern } from '../../../../../data/public/index_patterns/index_pattern.stub';
import { coreMock } from '../../../../../../core/public/mocks';
import { DiscoverServices } from '../../../build_services';
// @ts-ignore
import stubbedLogstashFields from '../../../__fixtures__/logstash_fields';
import { mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { DiscoverIndexPatternManagement } from './discover_index_pattern_management';

const mockServices = ({
  history: () => ({
    location: {
      search: '',
    },
  }),
  capabilities: {
    visualize: {
      show: true,
    },
    discover: {
      save: false,
    },
  },
  uiSettings: {
    get: (key: string) => {
      if (key === 'fields:popularLimit') {
        return 5;
      }
    },
  },
  indexPatternFieldEditor: {
    openEditor: jest.fn(),
    userPermissions: {
      editIndexPattern: jest.fn(),
    },
  },
} as unknown) as DiscoverServices;

jest.mock('../../../kibana_services', () => ({
  getServices: () => mockServices,
}));

describe('Discover IndexPattern Management', () => {
  const indexPattern = getStubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createSetup()
  );

  const editField = jest.fn();

  test('renders correctly', () => {
    const component = mountWithIntl(
      <DiscoverIndexPatternManagement
        services={mockServices}
        editField={editField}
        selectedIndexPattern={indexPattern}
        useNewFieldsApi={true}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
