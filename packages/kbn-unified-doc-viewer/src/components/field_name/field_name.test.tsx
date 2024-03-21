/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from 'enzyme';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-plugin/common/stubs';
import { FieldName } from './field_name';

describe('FieldName', function () {
  test('renders a string field by providing fieldType and fieldName', () => {
    const component = render(<FieldName fieldType="string" fieldName="test" />);
    expect(component).toMatchSnapshot();
  });

  test('renders a number field by providing a field record', () => {
    const component = render(<FieldName fieldName={'test.test.test'} fieldType={'number'} />);
    expect(component).toMatchSnapshot();
  });

  test('renders a geo field', () => {
    const component = render(<FieldName fieldName={'test.test.test'} fieldType={'geo_point'} />);
    expect(component).toMatchSnapshot();
  });

  test('renders unknown field', () => {
    const component = render(<FieldName fieldName={'test.test.test'} />);
    expect(component).toMatchSnapshot();
  });

  test('renders with a search highlight', () => {
    const component = render(
      <FieldName fieldName={'test.test.test'} fieldType={'number'} highlight="te" />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders when mapping is provided', () => {
    const component = render(
      <FieldName
        fieldName="test"
        fieldType="number"
        fieldMapping={dataView.getFieldByName('bytes')}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('renders a custom description icon', () => {
    const component = render(
      <FieldName
        fieldType="string"
        fieldName="test"
        fieldMapping={
          {
            ...dataView.getFieldByName('bytes')!.spec,
            customDescription: 'test description',
          } as DataViewField
        }
      />
    );
    expect(component).toMatchSnapshot();
  });
});
