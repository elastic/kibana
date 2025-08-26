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
    columnNumber: 10,
    fileName: '/path/to/component.tsx',
    lineNumber: 25,
  },
  relativePath: 'src/components/my_component',
  baseFileName: 'component.tsx',
  codeowners: ['@elastic/capybara-team'],
  euiData: {
    componentName: 'EuiButton',
    docsLink: 'https://eui.elastic.co/docs/components/button',
  },
  iconType: 'button',
  sourceComponent: {
    type: 'MyComponent',
    domElement: document.createElement('div'),
  },
  elementType: null,
  type: 'MyComponent',
  componentPath: 'MyComponent > EuiButton > div',
  domElement: document.createElement('div'),
};
