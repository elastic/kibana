import React from 'react';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { DiscoverFieldDetails } from '../discover_field_details';
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

export default {
  title: 'components/sidebar/DiscoverFieldDetails',
};

export const Default = () => (
  <div style={{ width: '50%' }}>
    <DiscoverFieldDetails
      field={field}
      dataView={dataView}
      details={details}
      onAddFilter={() => {
        alert('On add filter clicked');
      }}
    />
  </div>
);

Default.story = {
  name: 'default',
};

export const Scripted = () => (
  <div style={{ width: '50%' }}>
    <DiscoverFieldDetails
      field={scriptedField}
      dataView={dataView}
      details={details}
      onAddFilter={() => {}}
    />
  </div>
);

Scripted.story = {
  name: 'scripted',
};

export const Error = () => (
  <DiscoverFieldDetails
    field={field}
    dataView={dataView}
    details={{ buckets: [], error: 'An error occurred', exists: 1, total: 2, columns: [] }}
    onAddFilter={() => {}}
  />
);

Error.story = {
  name: 'error',
};
