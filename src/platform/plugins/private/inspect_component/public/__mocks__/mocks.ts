/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentData } from '../lib/get_inspected_element_data';

export const mockComponentData: ComponentData = {
  _debugSource: {
    columnNumber: 19,
    fileName: '/Users/dev/Desktop/kibana/src/plugins/shared/zoo/hot_spring/capybara.tsx',
    lineNumber: 93,
  },
  relativePath: 'src/plugins/shared/zoo/hot_spring/capybara.tsx',
  baseFileName: 'capybara.tsx',
  codeowners: ['@elastic/team-capybara'],
  euiData: {
    componentName: 'EuiButton',
    docsLink: 'https://eui.elastic.co/docs/components/button',
  },
  iconType: 'warning',
  sourceComponent: {
    type: 'CapybaraWrapper',
    element: document.createElement('div'),
  },
  elementType: null,
  type: 'button',
  element: document.createElement('button'),
};
