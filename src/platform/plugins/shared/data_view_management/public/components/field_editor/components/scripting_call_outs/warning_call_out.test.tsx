/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public/context';
import { mockManagementPlugin } from '../../../../mocks';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { ScriptingWarningCallOut } from './warning_call_out';

describe('ScriptingWarningCallOut', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();

  it('should render normally', async () => {
    renderWithKibanaRenderContext(
      <KibanaContextProvider services={mockedContext}>
        <ScriptingWarningCallOut isVisible={true} />
      </KibanaContextProvider>
    );

    expect(
      screen.getByText(
        'Scripted fields can be used to display and aggregate calculated values. As such, they can be very slow and, if done incorrectly, can cause Kibana to become unusable.',
        { exact: false }
      )
    ).toBeVisible();
    expect(screen.getByText('Scripted fields are deprecated')).toBeVisible();
    expect(
      screen.getByText('For greater flexibility and Painless script support, use', { exact: false })
    ).toBeVisible();
  });

  it('should render nothing if not visible', async () => {
    const { container } = renderWithKibanaRenderContext(
      <KibanaContextProvider services={mockedContext}>
        <ScriptingWarningCallOut isVisible={false} />
      </KibanaContextProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
