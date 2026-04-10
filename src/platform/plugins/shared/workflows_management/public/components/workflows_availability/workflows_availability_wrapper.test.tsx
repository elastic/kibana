/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { AvailabilityStatus } from '../../common/lib/availability/availability_service';
import { WorkflowsAvailabilityWrapper } from './workflows_availability_wrapper';

const availabilityStatus$ = new BehaviorSubject<AvailabilityStatus>({ isAvailable: true });

const mockGetAvailabilityStatus$ = jest.fn(() => availabilityStatus$.asObservable());
const mockGetAvailabilityStatus = jest.fn(() => availabilityStatus$.getValue());
const mockNavigateToApp = jest.fn();
const mockGetUrlForApp = jest.fn((appId: string) => `/app/${appId}`);
const mockGetPrivilegedUrls = jest.fn(() => Promise.resolve({ billingUrl: undefined }));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        navigateToApp: mockNavigateToApp,
        getUrlForApp: mockGetUrlForApp,
      },
      cloud: {
        getPrivilegedUrls: mockGetPrivilegedUrls,
      },
      workflowsManagement: {
        availability: {
          getAvailabilityStatus$: mockGetAvailabilityStatus$,
          getAvailabilityStatus: mockGetAvailabilityStatus,
        },
      },
    },
  }),
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: jest.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider colorMode="light">{ui}</EuiProvider>
    </I18nProvider>
  );

describe('WorkflowsAvailabilityWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    availabilityStatus$.next({ isAvailable: true });
    mockGetAvailabilityStatus.mockImplementation(() => availabilityStatus$.getValue());
  });

  it('should render children when workflows are available', () => {
    renderWithProviders(
      <WorkflowsAvailabilityWrapper>
        <div data-test-subj="childContent">{'Workflows content'}</div>
      </WorkflowsAvailabilityWrapper>
    );

    expect(screen.getByTestId('childContent')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowsAccessDeniedEmptyState')).not.toBeInTheDocument();
  });

  describe('when unavailable due to license', () => {
    beforeEach(() => {
      availabilityStatus$.next({ isAvailable: false, unavailabilityReason: 'license' });
    });

    it('should render access denied with license upgrade title and description', () => {
      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div data-test-subj="childContent" />
        </WorkflowsAvailabilityWrapper>
      );

      expect(screen.queryByTestId('childContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflowsAccessDeniedEmptyState')).toBeInTheDocument();
      expect(screen.getByText('Upgrade your license')).toBeInTheDocument();
      expect(
        screen.getByText('You need to upgrade your license to use Workflows.')
      ).toBeInTheDocument();
    });

    it('should show subscription plans and manage license actions', () => {
      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div />
        </WorkflowsAvailabilityWrapper>
      );

      expect(screen.getByText('Subscription plans')).toBeInTheDocument();
      expect(screen.getByText('Manage your license')).toBeInTheDocument();
    });

    it('should show the enterprise badge in the footer', () => {
      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div />
        </WorkflowsAvailabilityWrapper>
      );

      expect(screen.getByText('License required:')).toBeInTheDocument();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });
  });

  describe('when unavailable due to serverless tier', () => {
    beforeEach(() => {
      availabilityStatus$.next({
        isAvailable: false,
        unavailabilityReason: 'serverless_tier',
        requiredProducts: ['Security Complete'],
      });
    });

    it('should render access denied with serverless tier title and description', () => {
      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div data-test-subj="childContent" />
        </WorkflowsAvailabilityWrapper>
      );

      expect(screen.queryByTestId('childContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflowsAccessDeniedEmptyState')).toBeInTheDocument();
      expect(screen.getByText('Upgrade your subscription')).toBeInTheDocument();
      expect(
        screen.getByText(
          'You need to upgrade your serverless project subscription to use Workflows.'
        )
      ).toBeInTheDocument();
    });

    it('should show required product badges in the footer', () => {
      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div />
        </WorkflowsAvailabilityWrapper>
      );

      expect(screen.getByText('Security Complete')).toBeInTheDocument();
    });

    it('should show contact admin text when billing URL is not available', () => {
      mockGetPrivilegedUrls.mockResolvedValue({ billingUrl: undefined });

      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div />
        </WorkflowsAvailabilityWrapper>
      );

      expect(
        screen.getByText('Contact your administrator to upgrade your subscription.')
      ).toBeInTheDocument();
    });

    it('should show manage subscription button when billing URL is available', async () => {
      mockGetPrivilegedUrls.mockResolvedValue({
        billingUrl: 'https://cloud.elastic.co/billing',
      });

      renderWithProviders(
        <WorkflowsAvailabilityWrapper>
          <div />
        </WorkflowsAvailabilityWrapper>
      );

      expect(await screen.findByText('Manage subscription')).toBeInTheDocument();
    });
  });
});
