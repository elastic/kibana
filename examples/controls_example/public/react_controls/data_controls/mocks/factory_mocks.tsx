/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { DataControlFactory } from '../types';

export const getMockedSearchControlFactory = (api: any) =>
  ({
    type: 'search',
    getIconType: () => 'searchControlIcon',
    getDisplayName: () => 'Search',
    isFieldCompatible: (field) =>
      field.aggregatable &&
      field.searchable &&
      field.spec.type === 'string' &&
      (field.spec.esTypes ?? []).includes('text'),
    buildControl: jest.fn().mockReturnValue({
      api,
      Component: <>Search control component</>,
    }),
  } as DataControlFactory);

export const getMockedOptionsListControlFactory = (api: any) =>
  ({
    type: 'optionsList',
    getIconType: () => 'optionsListIcon',
    getDisplayName: () => 'Options list',
    isFieldCompatible: (field) =>
      field.aggregatable &&
      !field.spec.scripted &&
      ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type),
    buildControl: jest.fn().mockReturnValue({
      api,
      Component: <>Options list component</>,
    }),
    CustomOptionsComponent: () => (
      <div data-test-subj="optionsListCustomSettings">Custom options list component</div>
    ),
  } as DataControlFactory);

export const getMockedRangeSliderControlFactory = (api: any) =>
  ({
    type: 'rangeSlider',
    getIconType: () => 'rangeSliderIcon',
    getDisplayName: () => 'Range slider',
    isFieldCompatible: (field) => field.aggregatable && field.type === 'number',
    buildControl: jest.fn().mockReturnValue({
      api,
      Component: <>Range slider component</>,
    }),
  } as DataControlFactory);
