/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useBulkActions, useBulkAddToCaseActions, useBulkUntrackActions } from './use_bulk_actions';
import { createCasesServiceMock } from '../mocks/cases.mock';
import { BulkActionsVerbs, type PublicAlertsDataGridProps } from '../types';
import { AdditionalContext, RenderContext } from '../types';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { createPartialObjectMock, testQueryClientConfig } from '../utils/test';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';

jest.mock('../apis/bulk_get_cases');
jest.mock('../contexts/alerts_table_context');
jest.mocked(useAlertsTableContext).mockReturnValue(
  createPartialObjectMock<RenderContext<AdditionalContext>>({
    bulkActionsStore: [{}, jest.fn()],
  })
);

const mockCasesService = createCasesServiceMock();
const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const application = applicationServiceMock.createStartContract();
application.capabilities = { ...application.capabilities, infrastructure: { show: true } };
const queryClient = new QueryClient(testQueryClientConfig);
const wrapper = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
      {children}
    </QueryClientProvider>
  );
};

const caseId = 'test-case';
const casesConfig: PublicAlertsDataGridProps['casesConfiguration'] = {
  featureId: 'test-feature-id',
  owner: ['cases'],
};

describe('bulk action hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const refresh = jest.fn();
  const clearSelection = jest.fn();
  const mockOpenNewCase = jest.fn();
  const setIsBulkActionsLoading = jest.fn();

  const mockOpenExistingCase = jest.fn().mockImplementation(({ getAttachments }) => {
    getAttachments({ theCase: { id: caseId } });
  });

  mockCasesService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });
  mockCasesService.ui.getCasesContext = jest.fn().mockReturnValue(() => 'Cases context');

  const mockAddNewCase = mockCasesService.hooks.useCasesAddToNewCaseFlyout.mockReturnValue({
    open: mockOpenNewCase,
    close: jest.fn(),
  });
  const mockAddExistingCase = mockCasesService.hooks.useCasesAddToExistingCaseModal.mockReturnValue(
    {
      open: mockOpenExistingCase,
      close: jest.fn(),
    }
  );

  describe('useBulkAddToCaseActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should refetch when calling onSuccess of useCasesAddToNewCaseFlyout', async () => {
      renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      mockAddNewCase.mock.calls[0][0]!.onSuccess();
      expect(refresh).toHaveBeenCalled();
    });

    it('should refetch when calling onSuccess of useCasesAddToExistingCaseModal', async () => {
      renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      mockAddExistingCase.mock.calls[0][0]!.onSuccess();
      expect(refresh).toHaveBeenCalled();
    });

    it('should useCasesAddToExistingCaseModal with correct toaster params', async () => {
      renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(mockAddExistingCase).toHaveBeenCalledWith({
        noAttachmentsToaster: {
          title: 'No alerts added to the case',
          content: 'All selected alerts are already attached to the case',
        },
        onSuccess: expect.anything(),
      });
    });

    it('should open the case flyout', async () => {
      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[0].onClick([]);

      expect(mockCasesService.helpers.groupAlertsByRule).toHaveBeenCalled();
      expect(mockOpenNewCase).toHaveBeenCalled();
    });

    it('should open the case modal', async () => {
      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[1].onClick([]);

      expect(mockCasesService.helpers.groupAlertsByRule).toHaveBeenCalled();
      expect(mockOpenExistingCase).toHaveBeenCalled();
    });

    it('should open the flyout from the case modal', async () => {
      mockOpenExistingCase.mockImplementationOnce(({ getAttachments }) => {
        getAttachments({ theCase: undefined });
      });

      const alerts = [
        {
          _id: 'alert0',
          _index: 'idx0',
          data: [
            {
              field: 'kibana.alert.case_ids',
              value: [caseId],
            },
          ],
          ecs: {
            _id: 'alert0',
            _index: 'idx0',
          },
        },
        {
          _id: 'alert1',
          _index: 'idx1',
          data: [
            {
              field: 'kibana.alert.case_ids',
              value: ['test-case-2'],
            },
          ],
          ecs: {
            _id: 'alert1',
            _index: 'idx1',
          },
        },
      ];

      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[1].onClick(alerts);

      expect(mockCasesService.helpers.groupAlertsByRule).toHaveBeenCalledWith(alerts);
    });

    it('should remove alerts that are already attached to the case', async () => {
      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      // @ts-expect-error: cases do not need all arguments
      result.current[1].onClick([
        {
          _id: 'alert0',
          _index: 'idx0',
          data: [
            {
              field: 'kibana.alert.case_ids',
              value: [caseId],
            },
          ],
          ecs: {
            _id: 'alert0',
            _index: 'idx0',
          },
        },
        {
          _id: 'alert1',
          _index: 'idx1',
          data: [
            {
              field: 'kibana.alert.case_ids',
              value: ['test-case-2'],
            },
          ],
          ecs: {
            _id: 'alert1',
            _index: 'idx1',
          },
        },
      ]);

      expect(mockCasesService.helpers.groupAlertsByRule).toHaveBeenCalledWith([
        {
          _id: 'alert1',
          _index: 'idx1',
          data: [
            {
              field: 'kibana.alert.case_ids',
              value: ['test-case-2'],
            },
          ],
          ecs: {
            _id: 'alert1',
            _index: 'idx1',
          },
        },
      ]);
    });

    it('should not show the bulk actions when the user does not have write access', async () => {
      mockCasesService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: true });

      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });

    it('should not show the bulk actions when the user does not have read access', async () => {
      mockCasesService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: true, read: false });

      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });

    it('should call canUseCases with an empty owner when casesConfig is missing', async () => {
      renderHook(
        () =>
          useBulkAddToCaseActions({
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(mockCasesService.helpers.canUseCases).toHaveBeenCalledWith([]);
    });

    it('should not show the bulk actions when the cases context is missing', async () => {
      mockCasesService.ui.getCasesContext = jest.fn().mockReturnValue(() => null);

      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });

    it('should not show the bulk actions when the case service is not available', async () => {
      const { result } = renderHook(
        () =>
          useBulkAddToCaseActions({
            casesConfig,
            refresh,
            clearSelection,
            http,
            notifications,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });
  });

  describe('useBulkUntrackActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should not show the bulk actions when the user lacks any observability permissions', () => {
      const { result } = renderHook(
        () =>
          useBulkUntrackActions({
            setIsBulkActionsLoading,
            refresh,
            clearSelection,
            isAllSelected: true,
            query: {
              bool: {
                must: {
                  term: {
                    test: 'test',
                  },
                },
              },
            },
            http,
            notifications,
            application: {
              ...application,
              // Force no permissions
              capabilities: {} as unknown as typeof application.capabilities,
            },
          }),
        {
          wrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });
  });

  describe('useBulkActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockCasesService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: true, read: true });
    });

    it('appends the case and untrack bulk actions', async () => {
      const { result } = renderHook(
        () =>
          useBulkActions({
            alertsCount: 0,
            query: {},
            casesConfig,
            refresh,
            http,
            notifications,
            application,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.bulkActions).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 0,
            "items": Array [
              Object {
                "data-test-subj": "attach-new-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to new case",
                "key": "attach-new-case",
                "label": "Add to new case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "attach-existing-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to existing case",
                "key": "attach-existing-case",
                "label": "Add to existing case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "mark-as-untracked",
                "disableOnQuery": false,
                "disabledLabel": "Mark as untracked",
                "key": "mark-as-untracked",
                "label": "Mark as untracked",
                "onClick": [Function],
              },
            ],
          },
        ]
      `);
    });

    it('appends only the case bulk actions for SIEM', async () => {
      const { result } = renderHook(
        () =>
          useBulkActions({
            alertsCount: 0,
            query: {},
            casesConfig,
            refresh,
            ruleTypeIds: ['siem.esqlRule'],
            http,
            notifications,
            application,
            casesService: mockCasesService,
          }),
        {
          wrapper,
        }
      );

      expect(result.current.bulkActions).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 0,
            "items": Array [
              Object {
                "data-test-subj": "attach-new-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to new case",
                "key": "attach-new-case",
                "label": "Add to new case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "attach-existing-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to existing case",
                "key": "attach-existing-case",
                "label": "Add to existing case",
                "onClick": [Function],
              },
            ],
          },
        ]
      `);
    });

    it('should not append duplicate items on rerender', async () => {
      const onClick = () => {};
      const items = [
        {
          label: 'test',
          key: 'test',
          'data-test-subj': 'test',
          disableOnQuery: true,
          disabledLabel: 'test',
          onClick,
        },
      ];
      const customBulkActionConfig = [
        {
          id: 0,
          items,
        },
      ];
      const useBulkActionsConfig = () => customBulkActionConfig;
      const { result, rerender } = renderHook(
        () =>
          useBulkActions({
            alertsCount: 0,
            query: {},
            casesConfig,
            refresh,
            getBulkActions: useBulkActionsConfig,
            http,
            notifications,
            application,
          }),
        {
          wrapper,
        }
      );
      const initialBulkActions = result.current.bulkActions[0].items
        ? [...result.current.bulkActions[0].items]
        : [];
      result.current.updateBulkActionsState({ action: BulkActionsVerbs.selectCurrentPage });
      rerender();
      result.current.updateBulkActionsState({ action: BulkActionsVerbs.clear });
      rerender();
      result.current.updateBulkActionsState({ action: BulkActionsVerbs.selectCurrentPage });
      rerender();
      result.current.updateBulkActionsState({ action: BulkActionsVerbs.selectAll });
      rerender();
      const newBulkActions = result.current.bulkActions[0].items;
      expect(initialBulkActions).toEqual(newBulkActions);
    });

    it('hides bulk actions if hideBulkActions == true', () => {
      // make sure by default some actions are returned for this
      // config
      const { result: resultWithoutHideBulkActions } = renderHook(
        () =>
          useBulkActions({
            alertsCount: 0,
            query: {},
            casesConfig,
            refresh,
            ruleTypeIds: ['observability'],
            http,
            notifications,
            application,
          }),
        {
          wrapper,
        }
      );

      expect(resultWithoutHideBulkActions.current.bulkActions.length).toBeGreaterThan(0);

      const { result: resultWithHideBulkActions } = renderHook(
        () =>
          useBulkActions({
            alertsCount: 0,
            query: {},
            casesConfig,
            refresh,
            ruleTypeIds: ['observability'],
            hideBulkActions: true,
            http,
            notifications,
            application,
          }),
        {
          wrapper,
        }
      );

      expect(resultWithHideBulkActions.current.bulkActions.length).toBe(0);
    });
  });
});
