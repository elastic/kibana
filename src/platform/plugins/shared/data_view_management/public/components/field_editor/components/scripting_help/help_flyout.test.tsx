/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__/data_view';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';
import { ScriptingHelpFlyout } from './help_flyout';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: {
        links: {
          scriptedFields: {
            luceneExpressions: '#',
            painless: '#',
            painlessApi: '#',
            painlessSyntax: '#',
          },
        },
      },
    },
  }),
}));

const renderFlyout = (isVisible: boolean) =>
  renderWithI18n(
    <ScriptingHelpFlyout
      executeScript={jest.fn()}
      indexPattern={buildDataViewMock({})}
      isVisible={isVisible}
      lang="painless"
      onClose={jest.fn()}
    />
  );

describe('ScriptingHelpFlyout', () => {
  it('should render normally', () => {
    renderFlyout(true);

    expect(within(screen.getByTestId('syntaxTab')).getByText('Syntax')).toBeVisible();
    expect(within(screen.getByTestId('testTab')).getByText('Preview results')).toBeVisible();
    expect(screen.getByText('Painless')).toBeVisible();
  });

  it('should render nothing if not visible', () => {
    const { container } = renderFlyout(false);

    expect(container).toBeEmptyDOMElement();
  });
});
