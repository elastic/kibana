/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { CallOuts } from '.';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

describe('CallOuts', () => {
  it('should render normally', () => {
    renderWithI18n(
      <CallOuts
        deprecatedLangsInUse={['php']}
        painlessDocLink="http://www.elastic.co/painlessDocs"
      />
    );

    expect(screen.getByText('Deprecated languages in use')).toBeVisible();
    expect(
      screen.getByText('The following deprecated languages are in use: php.', { exact: false })
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Painless' })).toHaveAttribute(
      'href',
      'http://www.elastic.co/painlessDocs'
    );
  });

  it('should render without any call outs', () => {
    const { container } = renderWithI18n(
      <CallOuts deprecatedLangsInUse={[]} painlessDocLink="http://www.elastic.co/painlessDocs" />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
