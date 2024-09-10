/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterGroup } from './filter_group';
import { FC } from 'react';
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ControlGroupOutput,
  ControlGroupInput,
  ControlGroupContainer,
} from '@kbn/controls-plugin/public';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import { initialInputData, sampleOutputData } from './mocks/data';
import {
  COMMON_OPTIONS_LIST_CONTROL_INPUTS,
  DEFAULT_CONTROLS,
  TEST_IDS,
  URL_PARAM_KEY,
} from './constants';
import {
  controlGroupFilterInputMock$,
  controlGroupFilterOutputMock$,
  getControlGroupMock,
} from './mocks/control_group';
import { getMockedControlGroupRenderer } from './mocks/control_group_renderer';
import { URL_PARAM_ARRAY_EXCEPTION_MSG } from './translations';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FilterGroupProps } from './types';

const featureIds = [AlertConsumers.STACK_ALERTS];
const spaceId = 'test-space-id';
const LOCAL_STORAGE_KEY = `${featureIds.join(',')}.${spaceId}.${URL_PARAM_KEY}`;

const controlGroupMock = getControlGroupMock();

const updateControlGroupInputMock = (newInput: ControlGroupInput) => {
  act(() => {
    controlGroupFilterInputMock$.next(newInput);
    controlGroupMock.getInput.mockReturnValue(newInput);
  });
};

const updateControlGroupOutputMock = (newOutput: ControlGroupOutput) => {
  controlGroupFilterOutputMock$.next(newOutput);
};

const MockedControlGroupRenderer = getMockedControlGroupRenderer(
  controlGroupMock as unknown as ControlGroupContainer
);

const onFilterChangeMock = jest.fn();
const onInitMock = jest.fn();

const TestComponent: FC<Partial<FilterGroupProps>> = (props) => {
  return (
    <FilterGroup
      spaceId={spaceId}
      dataViewId="alert-filters-test-dv"
      featureIds={featureIds}
      defaultControls={[
        ...DEFAULT_CONTROLS,
        {
          fieldName: 'host.name',
          title: 'Host',
        },
      ]}
      chainingSystem="HIERARCHICAL"
      onFiltersChange={onFilterChangeMock}
      onInit={onInitMock}
      ControlGroupRenderer={MockedControlGroupRenderer}
      Storage={Storage}
      {...props}
    />
  );
};

const openContextMenu = async () => {
  fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.BTN));

  await waitFor(() => {
    expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible();
  });
};

describe(' Filter Group Component ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  describe('Basic Functions ', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.localStorage.clear();
    });
    it('should render', async () => {
      render(<TestComponent />);
      expect(screen.getByTestId(TEST_IDS.MOCKED_CONTROL)).toBeVisible();
      expect(screen.getByTestId(TEST_IDS.FILTER_CONTROLS)).toBeVisible();

      expect(onInitMock.mock.calls.length).toBe(1);
      expect(onInitMock.mock.calls[0][0]).toMatchObject(controlGroupMock);
    });

    it('should have context menu open when clicked', async () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.BTN));

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible();
      });
    });

    it('should go into edit mode without any issues', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).toBeVisible();
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).toBeDisabled();
      });
    });

    it('should have add button disable/enable when controls are more/less than max', async () => {
      render(<TestComponent maxControls={4} />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
        // save button should also be enable since changes have taken place
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).not.toBeDisabled();
      });
    });

    it('should open flyout when clicked on ADD', async () => {
      render(<TestComponent maxControls={4} />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
        // save button should also be enable since changes have taken place
        expect(screen.getByTestId(TEST_IDS.SAVE_CONTROL)).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId(TEST_IDS.ADD_CONTROL));

      await waitFor(() => {
        expect(controlGroupMock.openAddDataControlFlyout.mock.calls.length).toBe(1);
      });
    });

    it('should call controlGroupTransform which returns object WITHOUT placeholder when type != OPTION_LIST_CONTROL on opening Flyout', async () => {
      const returnValueWatcher = jest.fn();
      controlGroupMock.openAddDataControlFlyout.mockImplementationOnce(
        ({ controlInputTransform }) => {
          if (controlInputTransform) {
            const returnValue = controlInputTransform({}, 'NOT_OPTIONS_LIST_CONTROL');
            returnValueWatcher(returnValue);
          }
        }
      );
      render(<TestComponent />);
      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);
      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId(TEST_IDS.ADD_CONTROL));

      expect(returnValueWatcher.mock.calls[0][0]).not.toMatchObject(
        expect.objectContaining({
          placeholder: '',
        })
      );
    });

    it('should call controlGroupTransform which returns object WITH correct placeholder value when type = OPTION_LIST_CONTROL on opening Flyout', async () => {
      const returnValueWatcher = jest.fn();
      controlGroupMock.openAddDataControlFlyout.mockImplementationOnce(
        ({ controlInputTransform }) => {
          if (controlInputTransform) {
            const returnValue = controlInputTransform({}, OPTIONS_LIST_CONTROL);
            returnValueWatcher(returnValue);
          }
        }
      );

      render(<TestComponent />);
      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        // add button should be enabled now
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId(TEST_IDS.ADD_CONTROL));

      expect(returnValueWatcher.mock.calls[0][0]).toMatchObject(
        expect.objectContaining({
          placeholder: '',
        })
      );
    });

    it('should not rebuild controls while saving controls when controls are in desired order', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        panels: {
          // status as persistent controls is first in the position with order as 0
          '0': initialInputData.panels['0'],
          '1': initialInputData.panels['1'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.addOptionsListControl.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      // edit model gone
      await waitFor(() => expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0));
      // check if upsert was called correctly
      expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(0);
    });

    it('should rebuild and save controls successfully when controls are not in desired order', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': {
            ...initialInputData.panels['0'],
            // status is second in position.
            // this will force the rebuilding of controls
            order: 1,
          },
          '1': {
            ...initialInputData.panels['1'],
            order: 0,
          },
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.addOptionsListControl.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      // edit model gone
      await waitFor(() => expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0));
      // check if upsert was called correctly
      expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(2);
      // field id is not required to be passed when creating a control
      const { id, ...expectedInputData } = initialInputData.panels['0'].explicitInput;
      expect(controlGroupMock.addOptionsListControl.mock.calls[0][0]).toMatchObject({
        ...expectedInputData,
      });
    });

    it('should add persistable controls back on save, if deleted', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        panels: {
          // removed persitable control i.e. status at "0" key
          '3': initialInputData.panels['3'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.addOptionsListControl.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      await waitFor(() => {
        // edit model gone
        expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0);
        // check if upsert was called correctly
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(2);
        expect(controlGroupMock.addOptionsListControl.mock.calls[0][0]).toMatchObject({
          ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
          ...DEFAULT_CONTROLS[0],
        });

        // field id is not required to be passed  when creating a control
        const { id, ...expectedInputData } = initialInputData.panels['3'].explicitInput;

        expect(controlGroupMock.addOptionsListControl.mock.calls[1][0]).toMatchObject({
          ...expectedInputData,
        });
      });
    });

    it('should have Context menu changed when pending changes', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeVisible();
      });

      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD)).toBeVisible();
      });
    });

    it('should be able to discard changes', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      // await waitFor(() => {
      // expect(screen.getByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeVisible();
      // });
      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD)).toBeVisible();
      });

      controlGroupMock.updateInput.mockClear();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD));

      await waitFor(() => {
        expect(controlGroupMock.updateInput).toHaveBeenCalled();
        expect(controlGroupMock.updateInput.mock.calls.length).toBe(2);
        // discard changes
        expect(controlGroupMock.updateInput.mock.calls[0][0]).toMatchObject({
          panels: initialInputData.panels,
        });

        // shift to view mode
        expect(controlGroupMock.updateInput.mock.calls[1][0]).toMatchObject({
          viewMode: 'view',
        });
      });
    });

    it('should reset controls on clicking reset', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      await waitFor(() => expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible());

      controlGroupMock.addOptionsListControl.mockClear();
      controlGroupMock.updateInput.mockClear();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET));

      // blanks the input
      await waitFor(() => expect(controlGroupMock.updateInput.mock.calls.length).toBe(2));
      expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(5);
    });

    it('should restore controls saved in local storage', () => {
      global.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...initialInputData,
          panels: {
            '0': initialInputData.panels['0'],
          },
        })
      );

      // should create one control
      //
      render(<TestComponent />);
      expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(1);
    });

    it('should show/hide pending changes popover on mouseout/mouseover', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupInput);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        panels: {
          '0': initialInputData.panels['0'],
        },
      } as ControlGroupInput;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeVisible();
      });

      fireEvent.mouseOver(screen.getByTestId(TEST_IDS.SAVE_CONTROL));
      fireEvent.mouseOut(screen.getByTestId(TEST_IDS.SAVE_CONTROL));
      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeNull();
      });

      fireEvent.mouseOver(screen.getByTestId(TEST_IDS.SAVE_CONTROL));
      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeVisible();
      });
    });
    it('should update controlGroup with new filters and queries when valid query is supplied', async () => {
      const validQuery = { query: { language: 'kuery', query: '' } };
      // pass an invalid query
      render(<TestComponent {...validQuery} />);

      await waitFor(() => {
        expect(controlGroupMock.updateInput).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            filters: undefined,
            query: validQuery.query,
          })
        );
      });
    });

    it('should not update controlGroup with new filters and queries when invalid query is supplied', async () => {
      const invalidQuery = { query: { language: 'kuery', query: '\\' } };
      // pass an invalid query
      render(<TestComponent {...invalidQuery} />);

      await waitFor(() => {
        expect(controlGroupMock.updateInput).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: [],
            query: undefined,
          })
        );
      });
    });
  });

  describe('Filter Changed Banner', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.localStorage.clear();
    });

    it('should show banner if url filter and stored filters are not same', async () => {
      global.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialInputData));

      render(
        <TestComponent
          controlsUrlState={[
            {
              fieldName: 'abc',
            },
          ]}
        />
      );
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.FILTERS_CHANGED_BANNER)).toBeVisible();
      });
    });

    it('should use url filters if url and stored filters are not same', async () => {
      global.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialInputData));
      render(
        <TestComponent
          controlsUrlState={[
            {
              fieldName: 'abc',
            },
          ]}
        />
      );
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(2);
      expect(controlGroupMock.addOptionsListControl.mock.calls[0][1]).toMatchObject({
        ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
        ...DEFAULT_CONTROLS[0],
      });

      expect(controlGroupMock.addOptionsListControl.mock.calls[1][1]).toMatchObject({
        ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
        fieldName: 'abc',
      });

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.FILTERS_CHANGED_BANNER)).toBeVisible();
      });
    });

    it('should ignore url params if there is an error in using them', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementationOnce(jest.fn());

      render(
        <TestComponent
          controlsUrlState={
            {
              fieldName: 'abc',
            } as any
          }
        />
      );

      expect(consoleErrorSpy.mock.calls.length).toBe(1);
      expect(String(consoleErrorSpy.mock.calls[0][0])).toMatch(URL_PARAM_ARRAY_EXCEPTION_MSG);
    });
  });

  describe('onFilterChange', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      global.localStorage.clear();
    });
    it('should call onFilterChange when new filters have been published', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      updateControlGroupOutputMock(sampleOutputData);
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls.length).toBe(1);
        expect(onFilterChangeMock.mock.calls[0][0]).toMatchObject(sampleOutputData.filters);
      });

      // updating output should call filter change again with different output
      const changedOutput = { ...sampleOutputData, filters: [] };
      updateControlGroupOutputMock(changedOutput);
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls[1][0]).toMatchObject(changedOutput.filters);
      });
    });

    it('should pass empty onFilterChange as the initial state. Eg. in case of error', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      updateControlGroupOutputMock(sampleOutputData);

      jest.advanceTimersByTime(1000);
      updateControlGroupOutputMock({
        ...sampleOutputData,
        filters: undefined,
      });
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls.length).toBe(2);
        expect(onFilterChangeMock.mock.calls[1][0]).toMatchObject([]);
      });

      // updating output should call filter change again with different output
      const changedOutput = { ...sampleOutputData, filters: [] };
      updateControlGroupOutputMock(changedOutput);
      await waitFor(() => {
        expect(onFilterChangeMock.mock.calls[1][0]).toMatchObject(changedOutput.filters);
      });
    });

    it('should not call onFilterChange if same set of filters are published twice', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      updateControlGroupOutputMock(sampleOutputData);

      jest.advanceTimersByTime(1000);

      // updating output should call filter change again with different output
      const changedOutput = { ...sampleOutputData };
      onFilterChangeMock.mockClear();
      updateControlGroupOutputMock(changedOutput);
      await waitFor(() => {
        expect(onFilterChangeMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Restore from local storage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.localStorage.clear();
    });

    it('should restore from localstorage when one of the value is exists and exclude is false', async () => {
      updateControlGroupInputMock(initialInputData as ControlGroupInput);
      const savedData = {
        ...initialInputData,
        panels: {
          ...initialInputData.panels,
          '2': {
            ...initialInputData.panels['2'],
            explicitInput: {
              ...initialInputData.panels['2'].explicitInput,
              existsSelected: true,
              exclude: false,
            },
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(5);
        expect(controlGroupMock.addOptionsListControl.mock.calls[2][1]).toMatchObject(
          expect.objectContaining({
            existsSelected: true,
            exclude: false,
          })
        );
      });
    });

    it('should restore from localstorage when one of the value has both exists and exclude true', async () => {
      const savedData = {
        ...initialInputData,
        panels: {
          ...initialInputData.panels,
          '2': {
            ...initialInputData.panels['2'],
            explicitInput: {
              ...initialInputData.panels['2'].explicitInput,
              existsSelected: true,
              exclude: true,
            },
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(5);
        expect(controlGroupMock.addOptionsListControl.mock.calls[2][1]).toMatchObject(
          expect.objectContaining({
            existsSelected: true,
            exclude: true,
          })
        );
      });
    });
    it('should restore from localstorage when some value has selected options', async () => {
      const savedData = {
        ...initialInputData,
        panels: {
          ...initialInputData.panels,
          '2': {
            ...initialInputData.panels['2'],
            explicitInput: {
              ...initialInputData.panels['2'].explicitInput,
              selectedOptions: ['abc'],
            },
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(controlGroupMock.addOptionsListControl.mock.calls.length).toBe(5);
        expect(controlGroupMock.addOptionsListControl.mock.calls[2][1]).toMatchObject(
          expect.objectContaining({
            selectedOptions: ['abc'],
          })
        );
      });
    });
  });
});
