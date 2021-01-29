/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
// @ts-ignore
import stubbedLogstashFields from 'fixtures/logstash_fields';
import { mountWithIntl } from '@kbn/test/jest';
import { DiscoverField } from './discover_field';
import { coreMock } from '../../../../../../core/public/mocks';
import { IndexPatternField } from '../../../../../data/public';
import { getStubIndexPattern } from '../../../../../data/public/test_utils';

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
        }
      },
    },
  }),
}));

function getComponent({
  selected = false,
  showDetails = false,
  field,
}: {
  selected?: boolean;
  showDetails?: boolean;
  field?: IndexPatternField;
}) {
  const indexPattern = getStubIndexPattern(
    'logstash-*',
    (cfg: any) => cfg,
    'time',
    stubbedLogstashFields(),
    coreMock.createSetup()
  );

  const finalField =
    field ??
    new IndexPatternField({
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });

  const props = {
    indexPattern,
    field: finalField,
    getDetails: jest.fn(() => ({ buckets: [], error: '', exists: 1, total: 2, columns: [] })),
    onAddFilter: jest.fn(),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    showDetails,
    selected,
  };
  const comp = mountWithIntl(<DiscoverField {...props} />);
  return { comp, props };
}

describe('discover sidebar field', function () {
  it('should allow selecting fields', function () {
    const { comp, props } = getComponent({});
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    const { comp, props } = getComponent({ selected: true });
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('bytes');
  });
  it('should trigger getDetails', function () {
    const { comp, props } = getComponent({ selected: true });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledWith(props.field);
  });
  it('should not allow clicking on _source', function () {
    const field = new IndexPatternField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp, props } = getComponent({
      selected: true,
      field,
    });
    findTestSubject(comp, 'field-_source-showDetails').simulate('click');
    expect(props.getDetails).not.toHaveBeenCalled();
  });
});
