/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';

export const getMockedSearchControlFactory = (api: any) =>
  ({
    type: 'search',
    getIconType: () => 'searchControlIcon',
    getDisplayName: () => 'Search',
    buildEmbeddable: jest.fn().mockReturnValue({
      api,
      Component: <>Search control component</>,
    }),
  } as EmbeddableFactory);

export const getMockedOptionsListControlFactory = (api: any) =>
  ({
    type: 'optionsList',
    getIconType: () => 'optionsListIcon',
    getDisplayName: () => 'Options list',
    buildEmbeddable: jest.fn().mockReturnValue({
      api,
      Component: <>Options list component</>,
    }),
    CustomOptionsComponent: () => (
      <div data-test-subj="optionsListCustomSettings">Custom options list component</div>
    ),
  } as EmbeddableFactory);

export const getMockedRangeSliderControlFactory = (api: any) =>
  ({
    type: 'rangeSlider',
    getIconType: () => 'rangeSliderIcon',
    getDisplayName: () => 'Range slider',
    buildEmbeddable: jest.fn().mockReturnValue({
      api,
      Component: <>Range slider component</>,
    }),
  } as EmbeddableFactory);
