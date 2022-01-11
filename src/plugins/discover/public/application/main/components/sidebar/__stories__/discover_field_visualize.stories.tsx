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
import { DataView } from '../../../../../../../data_views/common';
import { fieldSpecMap } from './fields';
import { DiscoverFieldVisualizeInner } from '../discover_field_visualize_inner';
import { numericField as field } from './fields';

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

const visualizeInfo = {
  href: 'http://localhost:9001/',
  field,
};

const handleVisualizeLinkClick = () => {
  alert('Clicked');
};

storiesOf('components/sidebar/DiscoverFieldVisualizeInner', module).add('default', () => (
  <DiscoverFieldVisualizeInner
    field={field}
    visualizeInfo={visualizeInfo}
    handleVisualizeLinkClick={handleVisualizeLinkClick}
  />
));
