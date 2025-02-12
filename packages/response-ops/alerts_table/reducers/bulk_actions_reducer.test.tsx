/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useReducer } from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Alert } from '@kbn/alerting-types';
import { AlertsDataGrid } from '../components/alerts_data_grid';
import { AlertsField, BulkActionsConfig, BulkActionsState } from '../types';
import { RenderContext, AdditionalContext } from '../types';
import { bulkActionsReducer } from './bulk_actions_reducer';
import { createMockBulkActionsState, mockRenderContext } from '../mocks/context.mock';
import {
  TestAlertsDataGridProps,
  BaseAlertsDataGridProps,
  mockDataGridProps,
} from '../components/alerts_data_grid.test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';
import { getJsDomPerformanceFix, testQueryClientConfig } from '../utils/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
];

type AlertsTableWithBulkActionsContextProps = TestAlertsDataGridProps & {
  initialBulkActionsState?: BulkActionsState;
  renderContext?: Partial<RenderContext<AdditionalContext>>;
};

const mockRefresh = jest.mocked(mockRenderContext.refresh);
const mockCaseService = mockRenderContext.services.cases!;

const queryClient = new QueryClient(testQueryClientConfig);

const { fix, cleanup } = getJsDomPerformanceFix();
beforeAll(() => {
  fix();
});
afterAll(() => {
  cleanup();
});

describe('AlertsDataGrid bulk actions', () => {
  const alerts: Alert[] = [
    {
      _id: 'alert0',
      _index: 'idx0',
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
      [AlertsField.uuid]: ['uuidone'],
    },
    {
      _id: 'alert1',
      _index: 'idx1',
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
      [AlertsField.uuid]: ['uuidtwo'],
    },
  ];

  const dataGridProps: TestAlertsDataGridProps = {
    ...mockDataGridProps,
    getBulkActions: undefined,
  };

  const baseRenderContext = {
    ...mockRenderContext,
    showAlertStatusWithFlapping: false,
    pageSize: 10,
    alerts,
    renderActionsCell: undefined,
    columns,
    alertsCount: alerts.length,
  };

  const dataGridPropsWithBulkActions: AlertsTableWithBulkActionsContextProps = {
    ...dataGridProps,
    getBulkActions: () => [
      {
        id: 0,
        items: [
          {
            label: 'Fake Bulk Action',
            key: 'fakeBulkAction',
            'data-test-subj': 'fake-bulk-action',
            disableOnQuery: false,
            onClick: () => {},
          },
          {
            label: 'Fake Bulk Action with clear selection',
            key: 'fakeBulkActionClear',
            'data-test-subj': 'fake-bulk-action-clear',
            disableOnQuery: false,
            onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
              clearSelection();
            },
          },
          {
            label: 'Fake Bulk Action with loading and clear selection',
            key: 'fakeBulkActionLoadingClear',
            'data-test-subj': 'fake-bulk-action-loading',
            disableOnQuery: false,
            onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
              setIsBulkActionLoading(true);
            },
          },
          {
            label: 'Fake Bulk Action with refresh Action',
            key: 'fakeBulkActionRefresh',
            'data-test-subj': 'fake-bulk-action-refresh',
            disableOnQuery: false,
            onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
              refresh();
            },
          },
        ] as BulkActionsConfig[],
      },
      {
        id: 1,
        renderContent: () => <></>,
      },
    ],
  };

  const createDefaultBulkActionsState = () => ({
    ...createMockBulkActionsState(),
    rowCount: 2,
  });

  const TestComponent = ({
    initialBulkActionsState,
    renderContext: renderContextOverrides,
    ...props
  }: AlertsTableWithBulkActionsContextProps) => {
    const bulkActionsStore = useReducer(
      bulkActionsReducer,
      initialBulkActionsState || createDefaultBulkActionsState()
    );
    const renderContext = useMemo(
      () => ({
        ...baseRenderContext,
        bulkActionsStore,
        ...renderContextOverrides,
      }),
      [bulkActionsStore, renderContextOverrides]
    );

    return (
      <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
        <IntlProvider locale="en">
          <AlertsTableContextProvider value={renderContext}>
            <AlertsDataGrid {...({ ...props, renderContext } as BaseAlertsDataGridProps)} />
          </AlertsTableContextProvider>
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  describe('when the getBulkActions option is not set', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not show the bulk actions column', () => {
      render(<TestComponent {...dataGridProps} />);
      expect(screen.queryByTestId('bulk-actions-header')).not.toBeInTheDocument();
    });
  });

  describe('Cases', () => {
    beforeAll(() => {
      mockCaseService.helpers.canUseCases.mockReturnValue({ create: true, read: true });
      mockCaseService.ui.getCasesContext.mockReturnValue(() => <>Cases context</>);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      mockCaseService.ui.getCasesContext.mockReturnValue(() => null);
    });

    it('should show the bulk actions column when the cases service is defined', () => {
      mockCaseService.helpers.canUseCases.mockReturnValue({ create: true, read: true });

      render(<TestComponent {...dataGridProps} />);
      expect(screen.getByTestId('bulk-actions-header')).toBeInTheDocument();
    });

    it('should not show the bulk actions column when the case service is defined and the user does not have write access', () => {
      mockCaseService.helpers.canUseCases.mockReturnValue({ create: false, read: true });

      render(<TestComponent {...dataGridProps} />);

      expect(screen.queryByTestId('bulk-actions-header')).not.toBeInTheDocument();
    });

    it('should not show the bulk actions column when the case service is defined and the user does not have read access', () => {
      mockCaseService.helpers.canUseCases.mockReturnValue({ create: true, read: false });

      render(<TestComponent {...dataGridProps} />);

      expect(screen.queryByTestId('bulk-actions-header')).not.toBeInTheDocument();
    });

    it('should not show the bulk actions when the cases context is missing', () => {
      mockCaseService.ui.getCasesContext.mockReturnValue(() => null);

      render(<TestComponent {...dataGridProps} />);
      expect(screen.queryByTestId('bulk-actions-header')).not.toBeInTheDocument();
    });

    it('should pass the case ids when selecting alerts', async () => {
      const mockOnClick = jest.fn();
      const newAlerts: Alert[] = [
        {
          _id: 'alert0',
          _index: 'idx0',
          [AlertsField.name]: ['one'],
          [AlertsField.reason]: ['two'],
          [AlertsField.uuid]: ['uuidone'],
          [AlertsField.case_ids]: ['test-case'],
        },
      ];

      const props: AlertsTableWithBulkActionsContextProps = {
        ...dataGridPropsWithBulkActions,
        initialBulkActionsState: {
          ...createDefaultBulkActionsState(),
          isAllSelected: true,
          rowCount: 1,
          rowSelection: new Map([[0, { isLoading: false }]]),
        },
        getBulkActions: () => [
          {
            id: 0,
            items: [
              {
                label: 'Fake Bulk Action',
                key: 'fakeBulkAction',
                'data-test-subj': 'fake-bulk-action',
                disableOnQuery: false,
                onClick: mockOnClick,
              },
            ],
          },
        ],
        renderContext: {
          alerts: newAlerts,
        },
      };

      render(<TestComponent {...props} />);

      await userEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
      await waitForEuiPopoverOpen();

      await userEvent.click(await screen.findByText('Fake Bulk Action'));

      expect(mockOnClick.mock.calls[0][0]).toEqual([
        {
          _id: 'alert0',
          _index: 'idx0',
          data: [
            {
              field: 'kibana.alert.rule.name',
              value: ['one'],
            },
            {
              field: 'kibana.alert.rule.uuid',
              value: ['uuidone'],
            },
            {
              field: 'kibana.alert.case_ids',
              value: ['test-case'],
            },
            {
              field: 'kibana.alert.workflow_tags',
              value: [],
            },
            {
              field: 'kibana.alert.workflow_assignee_ids',
              value: [],
            },
          ],
          ecs: {
            _id: 'alert0',
            _index: 'idx0',
          },
        },
      ]);
    });
  });

  describe('when the getBulkActions option is set', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show the bulk actions column', async () => {
      render(<TestComponent {...dataGridPropsWithBulkActions} />);
      expect(await screen.findByTestId('bulk-actions-header')).toBeInTheDocument();
    });

    describe('and triggering the "select all" action', () => {
      it('should check that all rows are selected', async () => {
        render(<TestComponent {...dataGridPropsWithBulkActions} />);
        let bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeFalsy();
        expect(bulkActionsCells[1].checked).toBeFalsy();

        await userEvent.click(screen.getByTestId('bulk-actions-header'));

        bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeTruthy();
        expect(bulkActionsCells[1].checked).toBeTruthy();
      });

      it('should show the right amount of alerts selected', async () => {
        const props = {
          ...dataGridPropsWithBulkActions,
          initialBulkActionsState: {
            ...createDefaultBulkActionsState(),
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };

        render(<TestComponent {...props} />);
        expect(await screen.findByText('Selected 2 alerts')).toBeInTheDocument();
      });

      describe('and clicking on a single row', () => {
        it('should uncheck the select all header column', async () => {
          // State after having already clicked on select all before
          const props = {
            ...dataGridPropsWithBulkActions,
            initialBulkActionsState: {
              ...createDefaultBulkActionsState(),
              areAllVisibleRowsSelected: true,
              rowSelection: new Map([
                [0, { isLoading: false }],
                [1, { isLoading: false }],
              ]),
            },
          };
          render(<TestComponent {...props} />);
          const bulkActionsCells = screen.getAllByTestId(
            'bulk-actions-row-cell'
          ) as HTMLInputElement[];
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeTruthy();

          await userEvent.click(bulkActionsCells[1]);
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeFalsy();
        });
      });

      describe('and its a page with count of alerts different than page size', () => {
        it('should show the right amount of alerts selected', async () => {
          const secondPageAlerts: Alert[] = [
            {
              _id: 'alert2',
              _index: 'alerts',
              [AlertsField.name]: ['five'],
              [AlertsField.reason]: ['six'],
            },
          ];
          const allAlerts = [...alerts, ...secondPageAlerts];
          const props: AlertsTableWithBulkActionsContextProps = {
            ...dataGridPropsWithBulkActions,
            renderContext: {
              alerts: allAlerts,
              alertsCount: allAlerts.length,
              pageIndex: 1,
              pageSize: 2,
            },
            initialBulkActionsState: {
              ...createDefaultBulkActionsState(),
              areAllVisibleRowsSelected: true,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };
          render(<TestComponent {...props} />);

          expect(await screen.findByText('Selected 1 alert')).toBeInTheDocument();
          expect((await screen.findAllByTestId('bulk-actions-row-cell')).length).toBe(1);
        });
      });
    });

    describe('and clicking unselect all', () => {
      it('should uncheck all rows', async () => {
        // state after having already clicked on select all before
        const props = {
          ...dataGridPropsWithBulkActions,
          initialBulkActionsState: {
            ...createDefaultBulkActionsState(),
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };
        render(<TestComponent {...props} />);
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeTruthy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeTruthy();

        await userEvent.click(await screen.findByTestId('bulk-actions-header'));

        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeFalsy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeFalsy();
      });
    });

    describe('and a row is selected', () => {
      it('should show the toolbar', async () => {
        render(<TestComponent {...dataGridPropsWithBulkActions} />);

        expect(screen.queryByTestId('selectedShowBulkActionsButton')).not.toBeInTheDocument();
        expect(screen.queryByTestId('selectAllAlertsButton')).not.toBeInTheDocument();

        const bulkActionsCells = screen.getAllByTestId(
          'bulk-actions-row-cell'
        ) as HTMLInputElement[];
        await userEvent.click(bulkActionsCells[0]);

        expect(await screen.findByTestId('selectedShowBulkActionsButton')).toBeInTheDocument();
        expect(await screen.findByTestId('selectAllAlertsButton')).toBeInTheDocument();
      });

      describe('and the last remaining row is unchecked', () => {
        it('should hide the toolbar', async () => {
          // state after having already clicked on select all before
          const props = {
            ...dataGridPropsWithBulkActions,
            initialBulkActionsState: {
              ...createDefaultBulkActionsState(),
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };
          render(<TestComponent {...props} />);

          expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeDefined();
          expect(screen.getByTestId('selectAllAlertsButton')).toBeDefined();

          const bulkActionsCells = screen.getAllByTestId(
            'bulk-actions-row-cell'
          ) as HTMLInputElement[];
          await userEvent.click(bulkActionsCells[0]);

          expect(screen.queryByTestId('selectAllAlertsButton')).toBeNull();
          expect(screen.queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        });
      });
    });

    describe('and the toolbar is on ', () => {
      describe('and a bulk action is executed', () => {
        it('should return the selected alert ids', async () => {
          const mockOnClick = jest.fn();
          const props = {
            ...dataGridPropsWithBulkActions,
            initialBulkActionsState: {
              ...createDefaultBulkActionsState(),
              rowSelection: new Map([[1, { isLoading: false }]]),
            },
            getBulkActions: () => [
              {
                id: 0,
                items: [
                  {
                    label: 'Fake Bulk Action',
                    key: 'fakeBulkAction',
                    'data-test-subj': 'fake-bulk-action',
                    disableOnQuery: false,
                    onClick: mockOnClick,
                  },
                ],
              },
            ],
          };

          render(<TestComponent {...props} />);

          await userEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
          await waitForEuiPopoverOpen();

          await userEvent.click(await screen.findByText('Fake Bulk Action'));
          expect(mockOnClick.mock.calls[0][0]).toEqual([
            {
              _id: 'alert1',
              _index: 'idx1',
              data: [
                {
                  field: 'kibana.alert.rule.name',
                  value: ['three'],
                },
                {
                  field: 'kibana.alert.rule.uuid',
                  value: ['uuidtwo'],
                },
                {
                  field: 'kibana.alert.case_ids',
                  value: [],
                },
                {
                  field: 'kibana.alert.workflow_tags',
                  value: [],
                },
                {
                  field: 'kibana.alert.workflow_assignee_ids',
                  value: [],
                },
              ],
              ecs: {
                _id: 'alert1',
                _index: 'idx1',
              },
            },
          ]);
          expect(mockOnClick.mock.calls[0][1]).toEqual(false);
          expect(mockOnClick.mock.calls[0][2]).toBeDefined(); // it's a callback
        });

        describe('and the callback to represent the loading state is executed', () => {
          const mockOnClick = jest.fn();
          const props: TestAlertsDataGridProps = {
            ...dataGridPropsWithBulkActions,
            getBulkActions: () => [
              {
                id: 0,
                items: [
                  {
                    label: 'Fake Bulk Action',
                    key: 'fakeBulkAction',
                    'data-test-subj': 'fake-bulk-action',
                    disableOnQuery: false,
                    onClick: mockOnClick,
                  },
                ],
              },
            ],
          };

          it('should show the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...createDefaultBulkActionsState(),
              rowSelection: new Map([[1, { isLoading: false }]]),
            };
            render(<TestComponent {...props} initialBulkActionsState={initialBulkActionsState} />);

            await userEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            await userEvent.click(await screen.findByTestId('fake-bulk-action'));

            // The callback given to our clients to run when they want to update the loading state
            act(() => {
              mockOnClick.mock.calls[0][2](true);
            });

            expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
            const selectedOptions = await screen.findAllByTestId('dataGridRowCell');

            // First row, first column
            expect(within(selectedOptions[0]).queryByLabelText('Loading')).not.toBeInTheDocument();
            expect(within(selectedOptions[0]).getByRole('checkbox')).toBeInTheDocument();

            // Second row, first column
            expect(within(selectedOptions[3]).getByLabelText('Loading')).toBeInTheDocument();
            expect(within(selectedOptions[3]).queryByRole('checkbox')).not.toBeInTheDocument();
          });

          it('should hide the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...createDefaultBulkActionsState(),
              rowSelection: new Map([[1, { isLoading: true }]]),
            };
            render(<TestComponent {...props} initialBulkActionsState={initialBulkActionsState} />);
            await userEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            await userEvent.click(await screen.findByText('Fake Bulk Action'));

            // the callback given to our clients to run when they want to update the loading state
            mockOnClick.mock.calls[0][2](false);

            expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
          });
        });
      });

      describe('and select all is clicked', () => {
        it('should check all the visible rows', async () => {
          const props = {
            ...dataGridPropsWithBulkActions,
            initialBulkActionsState: {
              ...createDefaultBulkActionsState(),
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };

          render(<TestComponent {...props} />);

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeFalsy();

          await userEvent.click(screen.getByTestId('selectAllAlertsButton'));

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeTruthy();
        });

        describe('and clear the selection is clicked', () => {
          it('should turn off the toolbar', async () => {
            const props = {
              ...dataGridPropsWithBulkActions,
              initialBulkActionsState: {
                ...createDefaultBulkActionsState(),
                areAllVisibleRowsSelected: true,
                isAllSelected: true,
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
              },
            };

            render(<TestComponent {...props} />);

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeTruthy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeTruthy();

            await userEvent.click(screen.getByTestId('selectAllAlertsButton'));

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeFalsy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeFalsy();
          });
        });

        describe('and executing a bulk action', () => {
          it('should return the are all selected flag set to true', async () => {
            const mockOnClick = jest.fn();
            const props = {
              ...dataGridPropsWithBulkActions,
              initialBulkActionsState: {
                ...createDefaultBulkActionsState(),
                isAllSelected: true,
                rowCount: 2,
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
              },
              getBulkActions: () => [
                {
                  id: 0,
                  items: [
                    {
                      label: 'Fake Bulk Action',
                      key: 'fakeBulkAction',
                      'data-test-subj': 'fake-bulk-action',
                      disableOnQuery: false,
                      onClick: mockOnClick,
                    },
                  ],
                },
              ],
            };

            render(<TestComponent {...props} />);

            await userEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            await userEvent.click(screen.getByText('Fake Bulk Action'));
            expect(mockOnClick.mock.calls[0][0]).toEqual([
              {
                _id: 'alert0',
                _index: 'idx0',
                data: [
                  {
                    field: 'kibana.alert.rule.name',
                    value: ['one'],
                  },
                  {
                    field: 'kibana.alert.rule.uuid',
                    value: ['uuidone'],
                  },
                  {
                    field: 'kibana.alert.case_ids',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_tags',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_assignee_ids',
                    value: [],
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
                    field: 'kibana.alert.rule.name',
                    value: ['three'],
                  },
                  {
                    field: 'kibana.alert.rule.uuid',
                    value: ['uuidtwo'],
                  },
                  {
                    field: 'kibana.alert.case_ids',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_tags',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_assignee_ids',
                    value: [],
                  },
                ],
                ecs: {
                  _id: 'alert1',
                  _index: 'idx1',
                },
              },
            ]);
            expect(mockOnClick.mock.calls[0][1]).toEqual(true);
            expect(mockOnClick.mock.calls[0][2]).toBeDefined();
          });

          it('should first set all to loading, then clears the selection', async () => {
            const props = {
              ...dataGridPropsWithBulkActions,

              initialBulkActionsState: {
                ...createDefaultBulkActionsState(),
                areAllVisibleRowsSelected: true,
                rowSelection: new Map(),
              },
            };
            render(<TestComponent {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            await userEvent.click(screen.getByTestId('bulk-actions-header'));

            await waitFor(async () => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeTruthy();
              expect(bulkActionsCells[1].checked).toBeTruthy();
              expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeDefined();
            });

            await userEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            await userEvent.click(screen.getByTestId('fake-bulk-action-loading'));

            await waitFor(() => {
              expect(screen.queryAllByTestId('row-loader')).toHaveLength(2);
            });
          });

          it('should call refresh function of use fetch alerts when bulk action 3 is clicked', async () => {
            const props = {
              ...dataGridPropsWithBulkActions,
              initialBulkActionsState: {
                ...createDefaultBulkActionsState(),
                areAllVisibleRowsSelected: false,
                rowSelection: new Map(),
              },
            };
            render(<TestComponent {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            await userEvent.click(screen.getByTestId('bulk-actions-header'));

            await waitFor(async () => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeTruthy();
              expect(bulkActionsCells[1].checked).toBeTruthy();
              expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeDefined();
            });

            await userEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            mockRefresh.mockClear();
            expect(mockRefresh.mock.calls.length).toBe(0);
            await userEvent.click(screen.getByTestId('fake-bulk-action-refresh'));
            expect(mockRefresh.mock.calls.length).toBeGreaterThan(0);
          });

          it('should clear all selection on bulk action click', async () => {
            const props = {
              ...dataGridPropsWithBulkActions,

              initialBulkActionsState: {
                ...createDefaultBulkActionsState(),
                areAllVisibleRowsSelected: true,
                rowSelection: new Map([[0, { isLoading: true }]]),
              },
            };
            render(<TestComponent {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            await userEvent.click(screen.getByTestId('bulk-actions-header'));

            expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeVisible();

            await userEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            await userEvent.click(screen.getByTestId('fake-bulk-action-clear'));

            // clear Selection happens after 150ms
            await waitFor(() => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeFalsy();
              expect(bulkActionsCells[1].checked).toBeFalsy();
            });
          });
        });
      });
    });
  });
});
