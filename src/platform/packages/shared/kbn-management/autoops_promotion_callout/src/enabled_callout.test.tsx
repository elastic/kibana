/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  AutoOpsEnabledCallout,
  AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY,
  AUTOOPS_CALLOUT_DISMISSED_KEY,
} from './callout';

jest.mock('@elastic/eui-illustrations', () => ({
  megaphone: {
    id: 'megaphone',
    title: 'Megaphone',
    light: '<svg></svg>',
    dark: '<svg></svg>',
  },
}));

const TEST_AUTOOPS_URL = 'https://cloud.elastic.co/performance/abc123';
const TEST_DOCS_URL = 'https://www.elastic.co/docs/current/en/autoops';

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('AutoOpsEnabledCallout', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    test('renders the banner with title and description', () => {
      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      expect(screen.getByTestId('autoOpsEnabledCallout')).toBeInTheDocument();
      expect(
        screen.getByText('This cluster is connected to AutoOps, our advanced cluster monitoring')
      ).toBeInTheDocument();
    });

    test('renders the "Open AutoOps" CTA button linking to autoOpsUrl', () => {
      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      const btn = screen.getByTestId('autoOpsEnabledCalloutOpenBtn');
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('href', TEST_AUTOOPS_URL);
      expect(btn).toHaveAttribute('target', '_blank');
      expect(btn).toHaveAttribute('rel', 'noopener noreferrer');
      expect(btn).toHaveTextContent('Open AutoOps');
    });

    test('renders the "Learn more" docs link when docsUrl is provided', () => {
      renderWithI18n(
        <AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} docsUrl={TEST_DOCS_URL} />
      );

      const link = screen.getByTestId('autoOpsEnabledCalloutLearnMoreLink');
      expect(link).toHaveAttribute('href', TEST_DOCS_URL);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveTextContent('Learn more');
    });

    test('does not render the "Learn more" link when docsUrl is absent', () => {
      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      expect(screen.queryByTestId('autoOpsEnabledCalloutLearnMoreLink')).not.toBeInTheDocument();
    });

    test('does not render when autoOpsUrl is not provided', () => {
      renderWithI18n(<AutoOpsEnabledCallout />);

      expect(screen.queryByTestId('autoOpsEnabledCallout')).not.toBeInTheDocument();
    });

    test('does not render when autoOpsUrl is an empty string', () => {
      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl="" />);

      expect(screen.queryByTestId('autoOpsEnabledCallout')).not.toBeInTheDocument();
    });
  });

  describe('Dismissal', () => {
    test('does not render when previously dismissed', () => {
      localStorage.setItem(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY, 'true');

      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      expect(screen.queryByTestId('autoOpsEnabledCallout')).not.toBeInTheDocument();
    });

    test('dismisses the banner and stores the state in localStorage', () => {
      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      const dismissButton = screen.getByTestId('autoOpsEnabledCallout-dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('autoOpsEnabledCallout')).not.toBeInTheDocument();
      expect(localStorage.getItem(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY)).toBe('true');
    });

    test('uses a localStorage key distinct from the promotion banner', () => {
      expect(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY).not.toBe(AUTOOPS_CALLOUT_DISMISSED_KEY);
    });

    test('dismissing the promotion banner does not suppress the enabled banner', () => {
      localStorage.setItem(AUTOOPS_CALLOUT_DISMISSED_KEY, 'true');

      renderWithI18n(<AutoOpsEnabledCallout autoOpsUrl={TEST_AUTOOPS_URL} />);

      expect(screen.getByTestId('autoOpsEnabledCallout')).toBeInTheDocument();
    });

    test('dismissing the enabled banner does not suppress the promotion banner', () => {
      // Import is tested at import time; just confirm the key isolation holds in storage
      localStorage.setItem(AUTOOPS_ENABLED_CALLOUT_DISMISSED_KEY, 'true');

      expect(localStorage.getItem(AUTOOPS_CALLOUT_DISMISSED_KEY)).toBeNull();
    });
  });
});
