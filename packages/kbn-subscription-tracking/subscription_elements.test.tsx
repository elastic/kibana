/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SubscriptionLink,
  SubscriptionButton,
  SubscriptionButtonEmpty,
} from './subscription_elements';
import { SubscriptionTrackingProvider } from './services';
import { EVENT_NAMES, Services, SubscriptionContext } from './types';
import { coolDownTimeMs, resetCoolDown } from './use_impression';

const testServices: Services = {
  navigateToApp: jest.fn(),
  analyticsClient: {
    reportEvent: jest.fn(),
    registerEventType: jest.fn(),
  } as any,
};
const testContext: SubscriptionContext = { feature: 'test', source: 'security__test' };

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

const reset = () => {
  jest.resetAllMocks();
  resetCoolDown();
};

describe('SubscriptionElements', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  [SubscriptionButton, SubscriptionLink, SubscriptionButtonEmpty].forEach((SubscriptionElement) => {
    describe(SubscriptionElement.name, () => {
      beforeEach(reset);

      it('renders the children correctly', () => {
        renderWithProviders(
          <SubscriptionElement subscriptionContext={testContext}>Hello</SubscriptionElement>
        );
        expect(screen.getByText('Hello')).toBeTruthy();
      });

      it('fires an impression event when rendered', () => {
        renderWithProviders(<SubscriptionElement subscriptionContext={testContext} />);
        expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledWith(
          EVENT_NAMES.IMPRESSION,
          testContext
        );
      });

      it('fires an impression event when rendered (but only once)', () => {
        const { unmount } = renderWithProviders(
          <SubscriptionElement subscriptionContext={testContext} />
        );
        expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledTimes(1);
        unmount();

        // does not create an impression again when remounted
        const { unmount: unmountAgain } = renderWithProviders(
          <SubscriptionElement subscriptionContext={testContext} />
        );
        unmountAgain();
        expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledTimes(1);

        // only creates anew impression when the cooldown time has passed
        jest.setSystemTime(Date.now() + coolDownTimeMs);
        renderWithProviders(<SubscriptionElement subscriptionContext={testContext} />);
        expect(testServices.analyticsClient.reportEvent).toHaveBeenCalledTimes(2);
      });

      it('tracks a click when clicked and navigates to page', () => {
        renderWithProviders(
          <SubscriptionElement subscriptionContext={testContext}>hello</SubscriptionElement>
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
});
