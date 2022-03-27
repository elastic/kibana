/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DiscoverFieldDetails } from '../discover_field_details';
import { DataViewField } from "../../../../../../../data_views/public";
import { DataView } from '../../../../../../../data_views/public';
import { fieldSpecMap } from './fields';
import { numericField as field } from './fields';
import { Bucket } from '../types';

const buckets = [
  { count: 1, display: 'Stewart', percent: 50.0, value: 'Stewart' },
  { count: 1, display: 'Perry', percent: 50.0, value: 'Perry' },
] as Bucket[];
const details = { buckets, error: '', exists: 1, total: 2, columns: [] };

const fieldFormatInstanceType = {};
const defaultMap = {
  [KBN_FIELD_TYPES.NUMBER]: { id: KBN_FIELD_TYPES.NUMBER, params: {} },
};

const fieldFormat = {
  getByFieldType: (fieldType: KBN_FIELD_TYPES) => {
    return [fieldFormatInstanceType];
  },
  getDefaultConfig: () => {
    return defaultMap.number;
  },
  defaultMap,
};

const scriptedField = new DataViewField({
  name: 'machine.os',
  type: 'string',
  esTypes: ['long'],
  count: 10,
  scripted: true,
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
});

const dataView = new DataView({
  spec: {
    id: 'logstash-*',
    fields: fieldSpecMap,
    title: 'logstash-*',
    timeFieldName: '@timestamp',
  },
  metaFields: ['_id', '_type', '_source'],
  shortDotsEnable: false,
  // @ts-expect-error
  fieldFormats: fieldFormat,
});

storiesOf('components/sidebar/DiscoverFieldDetails', module)
  .add('default', () => (
    <div style={{ width: '50%' }}>
      <DiscoverFieldDetails
        field={field}
        indexPattern={dataView}
        details={details}
        onAddFilter={() => {
          alert('On add filter clicked');
        }}
      />
    </div>
  ))
  .add('scripted', () => (
    <div style={{ width: '50%' }}>
      <DiscoverFieldDetails
        field={scriptedField}
        indexPattern={dataView}
        details={details}
        onAddFilter={() => {}}
      />
    </div>
  ))
  .add('error', () => (
    <DiscoverFieldDetails
      field={field}
      indexPattern={dataView}
      details={{ buckets: [], error: 'An error occurred', exists: 1, total: 2, columns: [] }}
      onAddFilter={() => {}}
    />
  ));
