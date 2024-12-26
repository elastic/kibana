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
import { ControlGroupRendererApi, ControlGroupRuntimeState } from '@kbn/controls-plugin/public';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-plugin/common';
import { ControlGroupOutput, initialInputData, sampleOutputData } from './mocks/data';
import {
  COMMON_OPTIONS_LIST_CONTROL_INPUTS,
  DEFAULT_CONTROLS,
  TEST_IDS,
  URL_PARAM_KEY,
} from './constants';
import {
  controlGroupFilterOutputMock$,
  controlGroupFilterStateMock$,
  getControlGroupMock,
} from './mocks/control_group';
import {
  addOptionsListControlMock,
  getMockedControlGroupRenderer,
} from './mocks/control_group_renderer';
import { URL_PARAM_ARRAY_EXCEPTION_MSG } from './translations';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { FilterGroupProps } from './types';

const ruleTypeIds = ['.es-query'];
const spaceId = 'test-space-id';
const LOCAL_STORAGE_KEY = `${ruleTypeIds.join(',')}.${spaceId}.${URL_PARAM_KEY}`;

const controlGroupMock = getControlGroupMock();

const updateControlGroupInputMock = (newState: ControlGroupRuntimeState) => {
  act(() => {
    controlGroupMock.snapshotRuntimeState.mockReturnValue(newState);
    controlGroupFilterStateMock$.next(newState);
  });
};

const updateControlGroupOutputMock = (newOutput: ControlGroupOutput) => {
  controlGroupFilterOutputMock$.next(newOutput.filters);
};

const MockedControlGroupRenderer = getMockedControlGroupRenderer(
  controlGroupMock as unknown as ControlGroupRendererApi
);

const onFilterChangeMock = jest.fn();
const onInitMock = jest.fn();

const TestComponent: FC<Partial<FilterGroupProps>> = (props) => {
  return (
    <FilterGroup
      spaceId={spaceId}
      dataViewId="alert-filters-test-dv"
      ruleTypeIds={ruleTypeIds}
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
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

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.ADD_CONTROL)).toBeDisabled();
      });

      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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
      (controlGroupMock as unknown as ControlGroupRendererApi).openAddDataControlFlyout = jest
        .fn()
        .mockImplementationOnce(({ controlStateTransform }) => {
          if (controlStateTransform) {
            const returnValue = controlStateTransform({}, 'NOT_OPTIONS_LIST_CONTROL');
            returnValueWatcher(returnValue);
          }
        });
      render(<TestComponent />);
      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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
      (controlGroupMock as unknown as ControlGroupRendererApi).openAddDataControlFlyout = jest
        .fn()
        .mockImplementationOnce(({ controlStateTransform }) => {
          if (controlStateTransform) {
            const returnValue = controlStateTransform({}, OPTIONS_LIST_CONTROL);
            returnValueWatcher(returnValue);
          }
        });

      render(<TestComponent />);
      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          // status as persistent controls is first in the position with order as 0
          '0': initialInputData.initialChildControlState['0'],
          '1': initialInputData.initialChildControlState['1'],
        },
      } as ControlGroupRuntimeState;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.updateInput.mockClear();
      addOptionsListControlMock.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      // edit model gone
      await waitFor(() => expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0));
      // check if upsert was called correctly
      expect(addOptionsListControlMock.mock.calls.length).toBe(0);
      expect(controlGroupMock.updateInput.mock.calls.length).toBe(0);
    });

    it('should rebuild and save controls successfully when controls are not in desired order', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': {
            ...initialInputData.initialChildControlState['0'],
            // status is second in position.
            // this will force the rebuilding of controls
            order: 1,
          },
          '1': {
            ...initialInputData.initialChildControlState['1'],
            order: 0,
          },
        },
      } as ControlGroupRuntimeState;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.updateInput.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      // edit model gone
      await waitFor(() => expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0));
      // check if upsert was called correctly
      expect(controlGroupMock.updateInput.mock.calls.length).toBe(1);
      expect(controlGroupMock.updateInput.mock.calls[0][0]).toMatchObject({
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
          '1': initialInputData.initialChildControlState['1'],
        },
      });
    });

    it('should add persistable controls back on save, if deleted', async () => {
      render(<TestComponent />);
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // modify controls
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          // removed persitable control i.e. status at "0" key
          '3': initialInputData.initialChildControlState['3'],
        },
      } as ControlGroupRuntimeState;

      updateControlGroupInputMock(newInputData);

      // clear any previous calls to the API
      controlGroupMock.updateInput.mockClear();

      fireEvent.click(screen.getByTestId(TEST_IDS.SAVE_CONTROL));

      await waitFor(() => {
        // edit model gone
        expect(screen.queryAllByTestId(TEST_IDS.SAVE_CONTROL)).toHaveLength(0);
        // check if upsert was called correctly
        expect(controlGroupMock.updateInput.mock.calls.length).toBe(1);
        expect(controlGroupMock.updateInput.mock.calls[0][0]).toMatchObject({
          initialChildControlState: {
            '0': { ...COMMON_OPTIONS_LIST_CONTROL_INPUTS, ...DEFAULT_CONTROLS[0] },
            '1': { ...initialInputData.initialChildControlState['3'], order: 1 },
          },
        });
      });
    });

    it('should have Context menu changed when pending changes', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

      updateControlGroupInputMock(newInputData);

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.SAVE_CHANGE_POPOVER)).toBeVisible();
      });
      await openContextMenu();

      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD)).toBeVisible();
      });

      controlGroupMock.updateInput.mockClear();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.DISCARD));

      await waitFor(() => {
        expect(controlGroupMock.updateInput).toHaveBeenCalled();
        expect(controlGroupMock.updateInput.mock.calls.length).toBe(1);
        // discard changes
        expect(controlGroupMock.updateInput.mock.calls[0][0]).toMatchObject({
          initialChildControlState: initialInputData.initialChildControlState,
        });
      });
    });

    it('should reset controls on clicking reset', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      await waitFor(() => expect(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET)).toBeVisible());

      controlGroupMock.updateInput.mockClear();
      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.RESET));

      // blanks the input
      await waitFor(() => expect(controlGroupMock.updateInput.mock.calls.length).toBe(5));
    });

    it('should restore controls saved in local storage', async () => {
      addOptionsListControlMock.mockClear();
      global.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...initialInputData,
          initialChildControlState: {
            '0': initialInputData.initialChildControlState['0'],
          },
        })
      );

      // should create one control
      //
      render(<TestComponent />);
      expect(addOptionsListControlMock.mock.calls.length).toBe(1);
    });

    it('should show/hide pending changes popover on mouseout/mouseover', async () => {
      render(<TestComponent />);

      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);

      await openContextMenu();

      fireEvent.click(screen.getByTestId(TEST_IDS.CONTEXT_MENU.EDIT));

      // delete some panels
      const newInputData = {
        ...initialInputData,
        initialChildControlState: {
          '0': initialInputData.initialChildControlState['0'],
        },
      } as ControlGroupRuntimeState;

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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      await waitFor(() => {
        expect(screen.getByTestId(TEST_IDS.FILTERS_CHANGED_BANNER)).toBeVisible();
      });
    });

    it('should use url filters if url and stored filters are not same', async () => {
      addOptionsListControlMock.mockClear();
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      expect(addOptionsListControlMock.mock.calls.length).toBe(2);
      expect(addOptionsListControlMock.mock.calls[0][1]).toMatchObject({
        ...COMMON_OPTIONS_LIST_CONTROL_INPUTS,
        ...DEFAULT_CONTROLS[0],
      });
      expect(addOptionsListControlMock.mock.calls[1][1]).toMatchObject({
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      updateControlGroupOutputMock(sampleOutputData);

      jest.advanceTimersByTime(1000);
      updateControlGroupOutputMock({
        ...sampleOutputData,
        filters: [],
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
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
      updateControlGroupInputMock(initialInputData as ControlGroupRuntimeState);
      const savedData = {
        ...initialInputData,
        initialChildControlState: {
          ...initialInputData.initialChildControlState,
          '2': {
            ...initialInputData.initialChildControlState['2'],
            existsSelected: true,
            exclude: false,
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(addOptionsListControlMock.mock.calls.length).toBe(5);
        expect(addOptionsListControlMock.mock.calls[2][1]).toMatchObject(
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
        initialChildControlState: {
          ...initialInputData.initialChildControlState,
          '2': {
            ...initialInputData.initialChildControlState['2'],
            existsSelected: true,
            exclude: true,
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(addOptionsListControlMock.mock.calls.length).toBe(5);
        expect(addOptionsListControlMock.mock.calls[2][1]).toMatchObject(
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
        initialChildControlState: {
          ...initialInputData.initialChildControlState,
          '2': {
            ...initialInputData.initialChildControlState['2'],
            selectedOptions: ['abc'],
          },
        },
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedData));

      render(<TestComponent />);

      await waitFor(() => {
        expect(addOptionsListControlMock.mock.calls.length).toBe(5);
        expect(addOptionsListControlMock.mock.calls[2][1]).toMatchObject(
          expect.objectContaining({
            selectedOptions: ['abc'],
          })
        );
      });
    });
  });
});
