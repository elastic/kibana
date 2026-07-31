/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WaterfallSizeWarning } from './waterfall_size_warning';

const TEST_SUBJ = 'testWaterfallSizeWarning';

const renderComponent = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('WaterfallSizeWarning', () => {
  it('renders the warning callout', () => {
    renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={15000}
        maxTraceItems={5000}
        data-test-subj={TEST_SUBJ}
      />
    );

    expect(screen.getByTestId(TEST_SUBJ)).toBeInTheDocument();
  });

  it('displays traceDocsTotal and maxTraceItems in the message', () => {
    renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={15000}
        maxTraceItems={5000}
        data-test-subj={TEST_SUBJ}
      />
    );

    const warning = screen.getByTestId(TEST_SUBJ);
    expect(warning).toHaveTextContent('15000');
    expect(warning).toHaveTextContent('5000');
  });

  it('displays the config key in the message', () => {
    renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={15000}
        maxTraceItems={5000}
        data-test-subj={TEST_SUBJ}
      />
    );

    const warning = screen.getByTestId(TEST_SUBJ);
    expect(warning).toHaveTextContent('apmCommon.ui.maxTraceItems');
  });

  it('does not render a Discover link when discoverHref is not provided', () => {
    renderComponent(<WaterfallSizeWarning traceDocsTotal={15000} maxTraceItems={5000} />);

    expect(screen.queryByTestId(`${TEST_SUBJ}DiscoverLink`)).not.toBeInTheDocument();
  });

  it('renders a Discover link when discoverHref is provided', () => {
    renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={15000}
        maxTraceItems={5000}
        discoverHref="https://discover-url"
        data-test-subj={TEST_SUBJ}
      />
    );

    const link = screen.getByTestId(`${TEST_SUBJ}DiscoverLink`);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://discover-url');
    expect(link).toHaveTextContent('view the full trace in Discover');
  });

  it('uses different message templates with and without discoverHref', () => {
    const { unmount } = renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={10000}
        maxTraceItems={3000}
        data-test-subj={TEST_SUBJ}
      />
    );

    const withoutLink = screen.getByTestId(TEST_SUBJ).textContent;
    expect(withoutLink).not.toContain('view the full trace in Discover');

    unmount();

    renderComponent(
      <WaterfallSizeWarning
        traceDocsTotal={10000}
        maxTraceItems={3000}
        discoverHref="https://discover-url"
        data-test-subj={TEST_SUBJ}
      />
    );

    const withLink = screen.getByTestId(TEST_SUBJ).textContent;
    expect(withLink).toContain('view the full trace in Discover');
  });
});
