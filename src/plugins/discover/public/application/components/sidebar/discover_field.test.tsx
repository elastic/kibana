/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-ignore
import StubIndexPattern from 'test_utils/stub_index_pattern';
// @ts-ignore
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { DiscoverField } from './discover_field';
import { coreMock } from '../../../../../../core/public/mocks';
import { IndexPatternField } from '../../../../../data/public';

jest.mock('../../../kibana_services', () => ({
  getServices: () => ({
    history: () => ({
      location: {
        search: '',
      },
    }),
    capabilities: {
      visualize: {
        show: true,
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        } else if (key === 'shortDots:enable') {
          return false;
        }
      },
    },
  }),
}));

function getComponent(selected = false, showDetails = false, useShortDots = false) {
  const indexPattern = new StubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createStart()
  );

  const field = new IndexPatternField(
    indexPattern,
    {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    'bytes',
    () => {}
  );

  const props = {
    indexPattern,
    field,
    getDetails: jest.fn(),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    onShowDetails: jest.fn(),
    showDetails,
    selected,
    useShortDots,
  };
  const comp = mountWithIntl(<DiscoverField {...props} />);
  return { comp, props };
}

describe('discover sidebar field', function () {
  it('should allow selecting fields', function () {
    const { comp, props } = getComponent();
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    const { comp, props } = getComponent(true);
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('bytes');
  });
});
