/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AddToCaseModal } from './dashboard_add_to_case_modal';
import { coreServices, cases, shareService } from '../../../services/kibana_services';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../../dashboard_api/use_dashboard_internal_api';

import { buildMockDashboardApi } from '../../../mocks';

jest.mock('../../../services/kibana_services', () => ({
  cases: {
    ui: {
      getCasesContext: jest.fn(() => ({ children }: any) => <>{children}</>),
    },
    helpers: {
      canUseCases: jest.fn(() => ({
        all: true,
        create: true,
        read: true,
        update: true,
        delete: true,
        push: true,
        connectors: true,
        settings: true,
        reopenCase: true,
        createComment: true,
        assign: true,
      })),
    },
    hooks: {
      useCasesAddToExistingCaseModal: jest.fn(() => ({
        open: jest.fn(),
      })),
    },
  },
  shareService: {
    url: {
      locators: {
        get: jest.fn(() => ({
          getRedirectUrl: jest.fn().mockImplementation(({ timeRange }) => {
            return `/mock-redirect-url?from=${encodeURIComponent(
              timeRange.from
            )}&to=${encodeURIComponent(timeRange.to)}`;
          }),
        })),
      },
    },
  },
  coreServices: {
    notifications: {
      toasts: {
        addDanger: jest.fn(),
      },
    },
    application: {
      capabilities: {
        dashboard_v2: {
          save: true,
        },
      },
    },
  },
  dataService: {
    query: {
      timefilter: {
        timefilter: {
          getTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
          getRefreshInterval: jest.fn(() => ({ pause: true, value: 0 })),
        },
      },
    },
  },
}));

describe('AddToCaseModal', () => {
  const { api: mockDashboardApi, internalApi } = buildMockDashboardApi({
    savedObjectId: 'mockSavedId',
    overrides: {
      timeRange: { from: 'now-15m', to: 'now' },
    },
  });

  const mockDate = new Date('2025-06-17T15:37:53.937Z');
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore next line
    shareService.url.locators.get = jest.fn(() => ({
      getRedirectUrl: jest.fn().mockImplementation(({ timeRange }) => {
        return `/mock-redirect-url?from=${encodeURIComponent(
          timeRange.from
        )}&to=${encodeURIComponent(timeRange.to)}`;
      }),
    }));
  });

  it('renders null if cases is not available', () => {
    jest.mock('../../../services/kibana_services', () => ({ cases: null }));

    const { container } = render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardInternalContext.Provider value={internalApi}>
          <AddToCaseModal screenshot={null} isOpen={true} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when isOpen is true and required props are provided', () => {
    const open = jest.fn();
    const casesMock = cases!;
    jest.spyOn(casesMock.hooks, 'useCasesAddToExistingCaseModal').mockReturnValue({
      close: jest.fn(),
      open,
    });
    render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardInternalContext.Provider value={internalApi}>
          <AddToCaseModal screenshot="mockScreenshot" isOpen={true} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );

    expect(open).toBeCalledWith(
      expect.objectContaining({
        getAttachments: expect.any(Function),
      })
    );

    // Optionally, you can invoke the function and test its return value
    const callArgs = open.mock.calls[0][0];
    expect(callArgs.getAttachments()).toEqual([
      {
        persistableStateAttachmentTypeId: '.page',
        type: 'persistableState',
        persistableStateAttachmentState: {
          snapshot: {
            imgData: 'mockScreenshot',
          },
          type: 'dashboard',
          url: {
            iconType: 'dashboardApp',
            pathAndQuery:
              '/mock-redirect-url?from=2025-06-17T15%3A22%3A53.937Z&to=2025-06-17T15%3A37%3A53.937Z',
            label: 'My Dashboard',
            actionLabel: 'Go to dashboard',
          },
          screenContext: null,
        },
      },
    ]);
  });

  it('does not render the modal when isOpen is false', () => {
    const { container } = render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardInternalContext.Provider value={internalApi}>
          <AddToCaseModal screenshot="mockScreenshot" isOpen={false} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows a danger toast when the dashboard locator is not defined', () => {
    shareService.url.locators.get = jest.fn(() => undefined);

    render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardInternalContext.Provider value={internalApi}>
          <AddToCaseModal screenshot="mockScreenshot" isOpen={true} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );

    expect(coreServices.notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: expect.any(String),
      'data-test-subj': 'dashboardAddToCaseError',
    });
  });

  it('saves the time range in the URL as absolute time', () => {
    const open = jest.fn();
    const casesMock = cases!;
    jest.spyOn(casesMock.hooks, 'useCasesAddToExistingCaseModal').mockReturnValue({
      close: jest.fn(),
      open,
    });

    render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardInternalContext.Provider value={internalApi}>
          <AddToCaseModal screenshot="mockScreenshot" isOpen={true} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    );

    expect(open).toBeCalledWith(
      expect.objectContaining({
        getAttachments: expect.any(Function),
      })
    );

    const callArgs = open.mock.calls[0][0];
    const attachmentState = callArgs.getAttachments()[0].persistableStateAttachmentState;

    expect(attachmentState.url.pathAndQuery).toContain(
      '/mock-redirect-url?from=2025-06-17T15%3A22%3A53.937Z&to=2025-06-17T15%3A37%3A53.937Z'
    );
  });
});
