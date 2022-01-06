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
import { useEffect, useGlobals } from '@storybook/addons';
import { DataView } from '../../../../../../../data_views/common';
import { fieldSpecMap } from './fields';
import { DiscoverFieldVisualize } from '../discover_field_visualize';
import { numericField as field } from './fields';

const details = { buckets: [], error: '', exists: 1, total: 2, columns: [] };

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

storiesOf('components/sidebar/DiscoverFieldVisualize', module).add('default', () => (
  <DiscoverFieldVisualize field={field} indexPattern={dataView} details={details} />
));
