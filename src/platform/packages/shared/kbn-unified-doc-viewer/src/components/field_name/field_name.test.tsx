/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-plugin/common/stubs';
import { FieldName } from './field_name';
import { render, screen } from '@testing-library/react';

describe('FieldName', () => {
  test('renders a string field by providing fieldType and fieldName', () => {
    const FIELD_NAME = 'test';

    render(<FieldName fieldName={FIELD_NAME} fieldType="string" />);

    expect(screen.getByText(FIELD_NAME)).toBeVisible();
    expect(screen.getByText('String')).toBeVisible();
  });

  test('renders a number field by providing a field record', () => {
    const FIELD_NAME = 'test.test.test';

    render(<FieldName fieldName={FIELD_NAME} fieldType={'number'} />);

    expect(screen.getByText(FIELD_NAME)).toBeVisible();
    expect(screen.getByText('Number')).toBeVisible();
  });

  test('renders a geo field', () => {
    const FIELD_NAME = 'test.test.test';

    render(<FieldName fieldName={FIELD_NAME} fieldType={'geo_point'} />);

    expect(screen.getByText(FIELD_NAME)).toBeVisible();
    expect(screen.getByText('Geo point')).toBeVisible();
  });

  test('renders unknown field', () => {
    const FIELD_NAME = 'test.test.test';

    render(<FieldName fieldName={FIELD_NAME} />);

    expect(screen.getByText(FIELD_NAME)).toBeVisible();
    expect(screen.getByText('Unknown field')).toBeVisible();
  });

  test('renders with a search highlight', () => {
    render(<FieldName fieldName={'test.test.test'} fieldType={'number'} highlight="te" />);

    expect(screen.getByText('te').closest('mark')).toBeVisible();
    expect(screen.getByText('st.test.test')).toBeVisible();
    expect(screen.getByText('Number')).toBeVisible();
  });

  test('renders when mapping is provided', () => {
    const FIELD_MAP = 'bytes';
    const FIELD_NAME = 'test';

    render(
      <FieldName
        fieldMapping={dataView.getFieldByName(FIELD_MAP)}
        fieldName={FIELD_NAME}
        fieldType="number"
      />
    );

    expect(screen.getByText('Number')).toBeVisible();
    expect(screen.getByText(FIELD_MAP)).toBeVisible();
    expect(screen.queryByText(FIELD_NAME)).not.toBeInTheDocument();
  });

  test('renders a custom description icon', () => {
    const FIELD_DISPLAY_NAME = 'test description';
    const FIELD_MAP = 'bytes';
    const FIELD_NAME = 'test';

    render(
      <FieldName
        fieldType="string"
        fieldName={FIELD_NAME}
        fieldMapping={
          {
            ...dataView.getFieldByName(FIELD_MAP)!.spec,
            displayName: FIELD_DISPLAY_NAME,
          } as DataViewField
        }
      />
    );

    expect(screen.getByText('String')).toBeVisible();
    expect(screen.getByText(FIELD_DISPLAY_NAME)).toBeVisible();
    expect(screen.queryByText(FIELD_NAME)).not.toBeInTheDocument();
  });
});
