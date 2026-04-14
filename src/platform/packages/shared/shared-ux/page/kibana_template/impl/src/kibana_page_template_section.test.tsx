/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { KibanaPageTemplateSection } from './kibana_page_template_section';

describe('KibanaPageTemplateSection', () => {
  test('renders children', () => {
    render(
      <EuiProvider>
        <KibanaPageTemplateSection data-test-subj="kibanaPageSection" grow>
          <span>section body</span>
        </KibanaPageTemplateSection>
      </EuiProvider>
    );

    expect(screen.getByTestId('kibanaPageSection')).toHaveTextContent('section body');
  });
});
