/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { NewsEmptyPrompt } from './empty_news';

describe('NewsEmptyPrompt', () => {
  it('renders the empty newsfeed prompt', () => {
    render(
      <I18nProvider>
        <NewsEmptyPrompt />
      </I18nProvider>
    );

    expect(screen.getByTestId('emptyNewsfeed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No news?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /If your Kibana instance doesn’t have internet access, ask your administrator to disable this feature/
      )
    ).toBeInTheDocument();
  });
});
