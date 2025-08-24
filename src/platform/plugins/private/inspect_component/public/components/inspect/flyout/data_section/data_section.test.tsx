/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DataSection } from './data_section';
import type { ComponentData } from '../../../../lib/get_inspected_element_data';

describe('DataSection', () => {
  const mockComponentData: ComponentData = {
    columnNumber: 10,
    fileName: '/path/to/component.tsx',
    lineNumber: 25,
    relativePath: 'src/components/my_component',
    baseFileName: 'component.tsx',
    codeowners: ['@elastic/kibana-team'],
    euiData: {
      componentName: 'EuiButton',
      docsLink: 'https://elastic.github.io/eui/#/navigation/button',
    },
    iconType: 'button',
    sourceComponent: 'MyComponent',
  };

  const mockTargetDomElement = document.createElement('div');

  it('should render correctly', () => {
    renderWithI18n(<DataSection componentData={mockComponentData} target={mockTargetDomElement} />);

    const title = screen.getByText('MyComponent');
    expect(title).toBeInTheDocument();
  });
});
