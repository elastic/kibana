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
import { NewsLoadingPrompt } from './loading_news';

const renderPrompt = (showPlainSpinner: boolean) =>
  render(
    <I18nProvider>
      <NewsLoadingPrompt showPlainSpinner={showPlainSpinner} />
    </I18nProvider>
  );

describe('NewsLoadingPrompt', () => {
  it('renders the Elastic loading indicator', () => {
    renderPrompt(false);

    expect(screen.getByText('Getting the latest news...')).toBeInTheDocument();
    expect(screen.getByTestId('newsfeedElasticSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('newsfeedPlainSpinner')).not.toBeInTheDocument();
  });

  it('renders a plain spinner when showPlainSpinner is true', () => {
    renderPrompt(true);

    expect(screen.getByText('Getting the latest news...')).toBeInTheDocument();
    expect(screen.getByTestId('newsfeedPlainSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('newsfeedElasticSpinner')).not.toBeInTheDocument();
  });
});
