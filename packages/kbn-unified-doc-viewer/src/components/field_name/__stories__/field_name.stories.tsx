/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { FieldName } from '../field_name';

const field = new DataViewField({
  name: 'bytes',
  type: 'number',
  esTypes: ['long'],
  count: 10,
  scripted: false,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
});

const renderFieldName = (fldName: React.ReactNode) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      style={{ width: '30%', alignItems: 'flex-start', padding: '4px' }}
    >
      {fldName}
    </EuiFlexGroup>
  );
};

storiesOf('components/FieldName/FieldNameStories', module)
  .add('default', () => renderFieldName(<FieldName fieldName={'Discover test'} />))
  .add('with field type', () =>
    renderFieldName(<FieldName fieldName={'Discover test'} fieldType={'number'} />)
  )
  .add('with field mapping', () =>
    renderFieldName(
      <FieldName fieldName={'Discover test'} fieldMapping={field} fieldType={'number'} />
    )
  );
