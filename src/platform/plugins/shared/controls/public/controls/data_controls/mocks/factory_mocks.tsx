/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/common';
import { stubFields } from '@kbn/data-views-plugin/common/field.stub';
import type { CreateControlTypeAction } from '../../../actions/control_panel_actions';

interface ControlTypeContext {
  state: { field_name: string };
}

const mockIsCompatible = (
  { state: { field_name } }: ControlTypeContext,
  isFieldCompatible: (field: DataViewField) => boolean
) => {
  const field =
    stubFields.find((f) => f.name === field_name) ??
    new DataViewField({
      name: 'none',
      type: 'string',
      aggregatable: false,
      searchable: false,
    });
  return Promise.resolve(isFieldCompatible(field));
};

export const getMockedSearchControlFactory = (api: any): CreateControlTypeAction => {
  const isFieldCompatible = (field: DataViewField) =>
    field.aggregatable &&
    field.searchable &&
    field.spec.type === 'string' &&
    (field.spec.esTypes ?? []).includes('text');
  return {
    id: 'search',
    type: 'search',
    getIconType: () => 'searchControlIcon',
    getDisplayName: () => 'Search',
    isCompatible: (context) => mockIsCompatible(context as ControlTypeContext, isFieldCompatible),
    extension: {
      isFieldCompatible,
    },
    execute: jest.fn().mockReturnValue({
      api,
      Component: <>Search control component</>,
    }),
  };
};

export const getMockedOptionsListControlFactory = (api: any): CreateControlTypeAction => {
  const isFieldCompatible = (field: DataViewField) =>
    field.aggregatable &&
    !field.spec.scripted &&
    ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type);

  return {
    id: 'optionsList',
    type: 'optionsList',
    getIconType: () => 'optionsListIcon',
    getDisplayName: () => 'Options list',
    isCompatible: (context) => mockIsCompatible(context as ControlTypeContext, isFieldCompatible),
    extension: {
      CustomOptionsComponent: () => (
        <div data-test-subj="optionsListCustomSettings">Custom options list component</div>
      ),
      isFieldCompatible,
    },
    execute: jest.fn().mockReturnValue({
      api,
      Component: <>Options list component</>,
    }),
  };
};

export const getMockedRangeSliderControlFactory = (api: any): CreateControlTypeAction => {
  const isFieldCompatible = (field: DataViewField) => field.aggregatable && field.type === 'number';
  return {
    id: 'rangeSlider',
    type: 'rangeSlider',
    getIconType: () => 'rangeSliderIcon',
    getDisplayName: () => 'Range slider',
    isCompatible: (context) => mockIsCompatible(context as ControlTypeContext, isFieldCompatible),
    extension: {
      isFieldCompatible,
    },
    execute: jest.fn().mockReturnValue({
      api,
      Component: <>Range slider component</>,
    }),
  };
};
