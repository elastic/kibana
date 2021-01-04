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
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { mountWithIntl } from '@kbn/test/jest';
import { DiscoverFieldDetails } from './discover_field_details';
import { coreMock } from '../../../../../../core/public/mocks';
import { IndexPatternField } from '../../../../../data/public';
import { getStubIndexPattern } from '../../../../../data/public/test_utils';

const indexPattern = getStubIndexPattern(
  'logstash-*',
  (cfg: any) => cfg,
  'time',
  stubbedLogstashFields(),
  coreMock.createSetup()
);

describe('discover sidebar field details', function () {
  const defaultProps = {
    indexPattern,
    details: { buckets: [], error: '', exists: 1, total: true, columns: [] },
    onAddFilter: jest.fn(),
  };

  function mountComponent(field: IndexPatternField) {
    const compProps = { ...defaultProps, field };
    return mountWithIntl(<DiscoverFieldDetails {...compProps} />);
  }

  it('should enable the visualize link for a number field', function () {
    const visualizableField = new IndexPatternField({
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const comp = mountComponent(visualizableField);
    expect(findTestSubject(comp, 'fieldVisualize-bytes')).toBeTruthy();
  });

  it('should disable the visualize link for an _id field', function () {
    const conflictField = new IndexPatternField({
      name: '_id',
      type: 'string',
      esTypes: ['_id'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const comp = mountComponent(conflictField);
    expect(findTestSubject(comp, 'fieldVisualize-_id')).toEqual({});
  });

  it('should disable the visualize link for an unknown field', function () {
    const unknownField = new IndexPatternField({
      name: 'test',
      type: 'unknown',
      esTypes: ['double'],
      count: 0,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const comp = mountComponent(unknownField);
    expect(findTestSubject(comp, 'fieldVisualize-test')).toEqual({});
  });
});
