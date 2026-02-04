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
import { AutoOpsPromotionCallout, AUTOOPS_CALLOUT_DISMISSED_KEY } from './callout';

// Helper to wrap component with I18nProvider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('AutoOpsPromotionCallout', () => {
  const defaultProps = {
    learnMoreLink: 'https://www.elastic.co/cloud/autoops',
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    test('renders the callout with default props', () => {
      renderWithI18n(<AutoOpsPromotionCallout {...defaultProps} />);

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
      expect(
        screen.getByText('New! Connect AutoOps to this self-managed cluster')
      ).toBeInTheDocument();
      expect(screen.getByTestId('autoOpsPromotionCalloutConnectButton')).toBeInTheDocument();
    });

    test('renders with custom cloudConnectUrl', () => {
      renderWithI18n(<AutoOpsPromotionCallout {...defaultProps} cloudConnectUrl="/custom/path" />);

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      expect(button).toHaveAttribute('href', '/custom/path');
    });

    test('renders learn more link', () => {
      renderWithI18n(<AutoOpsPromotionCallout {...defaultProps} />);

      const learnMoreLink = screen.getByText('Learn more');
      expect(learnMoreLink).toBeInTheDocument();
      expect(learnMoreLink.closest('a')).toHaveAttribute('href', defaultProps.learnMoreLink);
    });
  });

  describe('Dismissal functionality', () => {
    test('does not render when previously dismissed', () => {
      localStorage.setItem(AUTOOPS_CALLOUT_DISMISSED_KEY, 'true');

      renderWithI18n(<AutoOpsPromotionCallout {...defaultProps} />);

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('dismisses the callout and stores in localStorage', () => {
      renderWithI18n(<AutoOpsPromotionCallout {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss this callout');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
      expect(localStorage.getItem(AUTOOPS_CALLOUT_DISMISSED_KEY)).toBe('true');
    });
  });

  describe('Button behavior with permissions', () => {
    test('renders internal navigation when hasCloudConnectPermission is true', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          {...defaultProps}
          hasCloudConnectPermission={true}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      expect(button).toHaveAttribute('href', '/app/cloud_connect');
    });

    test('renders internal navigation when hasCloudConnectPermission is undefined (backward compatible)', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          {...defaultProps}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      expect(button).toHaveAttribute('href', '/app/cloud_connect');
    });

    test('renders external link when hasCloudConnectPermission is false', () => {
      renderWithI18n(
        <AutoOpsPromotionCallout {...defaultProps} hasCloudConnectPermission={false} />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      expect(button).toHaveAttribute(
        'href',
        'https://cloud.elastic.co/connect-cluster-services-portal'
      );
    });
  });

  describe('Click handler', () => {
    test('calls onConnectClick and preventDefault when user has permission', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          {...defaultProps}
          hasCloudConnectPermission={true}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      fireEvent.click(button);

      expect(onConnectClick).toHaveBeenCalled();
      expect(onConnectClick).toHaveBeenCalledWith(expect.any(Object));
    });

    test('does not call onConnectClick when user lacks permission', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          {...defaultProps}
          hasCloudConnectPermission={false}
          onConnectClick={onConnectClick}
        />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');

      expect(button.onclick).toBeNull();
    });

    test('calls onConnectClick when hasCloudConnectPermission is undefined', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          {...defaultProps}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const button = screen.getByTestId('autoOpsPromotionCalloutConnectButton');
      fireEvent.click(button);

      expect(onConnectClick).toHaveBeenCalled();
    });
  });
});
