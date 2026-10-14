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

jest.mock('@elastic/eui-illustrations', () => ({
  megaphone: {
    id: 'megaphone',
    title: 'Megaphone',
    light: '<svg></svg>',
    dark: '<svg></svg>',
  },
}));

const CLOUD_CONNECT_DOCS_URL = 'https://www.elastic.co/docs/deploy-manage/cloud-connect';
const CLOUD_CONNECT_PORTAL_URL = 'https://cloud.elastic.co/connect-cluster-services-portal';

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('AutoOpsPromotionCallout', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    test('renders the banner with default props', () => {
      renderWithI18n(<AutoOpsPromotionCallout />);

      expect(screen.getByTestId('autoOpsPromotionCallout')).toBeInTheDocument();
      expect(screen.getByText('New! Connect this cluster to AutoOps')).toBeInTheDocument();
    });

    test('renders the docs link pointing to Cloud Connect documentation', () => {
      renderWithI18n(<AutoOpsPromotionCallout />);

      const docsLink = screen.getByTestId('autoOpsPromotionCalloutDocsLink');
      expect(docsLink).toBeInTheDocument();
      expect(docsLink).toHaveAttribute('href', CLOUD_CONNECT_DOCS_URL);
    });

    test('docs link opens in a new tab', () => {
      renderWithI18n(<AutoOpsPromotionCallout />);

      const docsLink = screen.getByTestId('autoOpsPromotionCalloutDocsLink');
      expect(docsLink).toHaveAttribute('target', '_blank');
      expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('renders a "Get Started" CTA button pointing to cloud_connect app by default', () => {
      renderWithI18n(<AutoOpsPromotionCallout cloudConnectUrl="/app/cloud_connect" />);

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      expect(ctaBtn).toBeInTheDocument();
      expect(ctaBtn).toHaveAttribute('href', '/app/cloud_connect');
      expect(ctaBtn).toHaveTextContent('Get Started');
    });

    test('CTA button uses the custom cloudConnectUrl', () => {
      renderWithI18n(<AutoOpsPromotionCallout cloudConnectUrl="/custom/path" />);

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      expect(ctaBtn).toHaveAttribute('href', '/custom/path');
    });
  });

  describe('Dismissal functionality', () => {
    test('does not render when previously dismissed', () => {
      localStorage.setItem(AUTOOPS_CALLOUT_DISMISSED_KEY, 'true');

      renderWithI18n(<AutoOpsPromotionCallout />);

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
    });

    test('dismisses the banner and stores the state in localStorage', () => {
      renderWithI18n(<AutoOpsPromotionCallout />);

      const dismissButton = screen.getByTestId('autoOpsPromotionCallout-dismiss');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('autoOpsPromotionCallout')).not.toBeInTheDocument();
      expect(localStorage.getItem(AUTOOPS_CALLOUT_DISMISSED_KEY)).toBe('true');
    });
  });

  describe('CTA button behavior with permissions', () => {
    test('CTA navigates internally when hasCloudConnectPermission is true', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          hasCloudConnectPermission={true}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      expect(ctaBtn).toHaveAttribute('href', '/app/cloud_connect');
    });

    test('CTA navigates internally when hasCloudConnectPermission is undefined (backward compatible)', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      expect(ctaBtn).toHaveAttribute('href', '/app/cloud_connect');
    });

    test('CTA points to the external portal when hasCloudConnectPermission is false', () => {
      renderWithI18n(<AutoOpsPromotionCallout hasCloudConnectPermission={false} />);

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      expect(ctaBtn).toHaveAttribute('href', CLOUD_CONNECT_PORTAL_URL);
      expect(ctaBtn).toHaveAttribute('target', '_blank');
    });

    test('docs link always points to the documentation URL regardless of permission', () => {
      renderWithI18n(<AutoOpsPromotionCallout hasCloudConnectPermission={false} />);

      const docsLink = screen.getByTestId('autoOpsPromotionCalloutDocsLink');
      expect(docsLink).toHaveAttribute('href', CLOUD_CONNECT_DOCS_URL);
    });
  });

  describe('Click handler', () => {
    test('calls onConnectClick when user has permission and clicks the CTA button', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          hasCloudConnectPermission={true}
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      fireEvent.click(ctaBtn);

      expect(onConnectClick).toHaveBeenCalled();
      expect(onConnectClick).toHaveBeenCalledWith(expect.any(Object));
    });

    test('calls onConnectClick when hasCloudConnectPermission is undefined', () => {
      const onConnectClick = jest.fn();
      renderWithI18n(
        <AutoOpsPromotionCallout
          cloudConnectUrl="/app/cloud_connect"
          onConnectClick={onConnectClick}
        />
      );

      const ctaBtn = screen.getByTestId('autoOpsPromotionCalloutConnectBtn');
      fireEvent.click(ctaBtn);

      expect(onConnectClick).toHaveBeenCalled();
    });
  });
});
