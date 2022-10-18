/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SubscriptionLink, SubscriptionButton } from './subscription_elements';
import { SubscriptionTrackingProvider } from './services';
import { EVENT_NAMES, Services, SubscriptionContext } from './types';

const testServices: Services = {
  navigateToApp: jest.fn(),
  analyticsClient: {
    reportEvent: jest.fn(),
    registerEventType: jest.fn(),
  } as any,
};
const testContext: SubscriptionContext = { feature: 'test', source: 'security::test' };

const WithProviders: React.FC = ({ children }) => (
  <SubscriptionTrackingProvider
    analyticsClient={testServices.analyticsClient}
    navigateToApp={testServices.navigateToApp}
  >
    {children}
  </SubscriptionTrackingProvider>
);

const renderWithProviders = (children: React.ReactElement) =>
  render(children, { wrapper: WithProviders });

describe('SubscriptionElements', () => {
  describe('SubscriptionLink', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('renders the children correctly', () => {
      renderWithProviders(
        <SubscriptionLink subscriptionContext={testContext}>Hello</SubscriptionLink>
      );
      expect(screen.getByText('Hello')).toBeTruthy();
    });

    it('fires an impression event when rendered', () => {
      renderWithProviders(<SubscriptionLink subscriptionContext={testContext} />);
      expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledWith(
        EVENT_NAMES.IMPRESSION,
        testContext
      );
    });

    it('tracks a click when clicked and navigates to page', () => {
      renderWithProviders(
        <SubscriptionLink subscriptionContext={testContext}>hello</SubscriptionLink>
      );

      screen.getByText('hello').click();
      expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledWith(
        EVENT_NAMES.CLICK,
        testContext
      );
      expect(testServices.navigateToApp).toHaveBeenCalled();
    });
  });

  describe('SubscriptionButton', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('renders the children correctly', () => {
      renderWithProviders(
        <SubscriptionButton subscriptionContext={testContext}>Hello</SubscriptionButton>
      );
      expect(screen.getByText('Hello')).toBeTruthy();
    });

    it('fires an impression event when rendered', () => {
      renderWithProviders(<SubscriptionButton subscriptionContext={testContext} />);
      expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledWith(
        EVENT_NAMES.IMPRESSION,
        testContext
      );
    });

    it('tracks a click when clicked and navigates to page', () => {
      renderWithProviders(
        <SubscriptionButton subscriptionContext={testContext}>hello</SubscriptionButton>
      );

      screen.getByText('hello').click();
      expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledWith(
        EVENT_NAMES.CLICK,
        testContext
      );
      expect(testServices.navigateToApp).toHaveBeenCalled();
    });
  });
});
