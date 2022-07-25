/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldPicker } from './field_picker';
import { storybookFlightsDataView } from '../../mocks';

export default {
  component: FieldPicker,
  title: 'Field Picker',
};

export const FieldPickerWithDataView = () => {
  return <FieldPicker dataView={storybookFlightsDataView} />;
};

export const FieldPickerWithFilter = () => {
  return (
    <FieldPicker
      dataView={storybookFlightsDataView}
      filterPredicate={(f: DataViewField) => {
        // Only show fields with "Dest" in the title
        return f.name.includes('Dest');
      }}
    />
  );
};

export const FieldPickerWithoutIndexPattern = () => {
  return <FieldPicker />;
};
