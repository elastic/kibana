/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Store } from 'redux';
import { ReactWrapper as GenericReactWrapper } from 'enzyme';
import { LocationDescriptor } from 'history';

export type AsyncSetupFunc<T> = (props?: any) => Promise<TestBed<T>>;
export type SyncSetupFunc<T> = (props?: any) => TestBed<T>;
export type SetupFunc<T> = (props?: any) => TestBed<T> | Promise<TestBed<T>>;
export type ReactWrapper = GenericReactWrapper<any>;

export interface EuiTableMetaData {
  /** Array of rows of the table. Each row exposes its reactWrapper and its columns */
  rows: Array<{
    reactWrapper: ReactWrapper;
    columns: Array<{
      reactWrapper: ReactWrapper;
      value: string;
    }>;
  }>;
  /** A 2 dimensional array of rows & columns containing
   * the text content of each cell of the table */
  tableCellsValues: string[][];
}

export interface TestBed<T = string> {
  /** The comonent under test */
  component: ReactWrapper;
  /**
   * Pass it a `data-test-subj` and it will return true if it exists or false if it does not exist.
   *
   * @param testSubject The data test subject to look for (can be a nested path. e.g. "detailPanel.mySection").
   * @param count The number of times the subject needs to appear in order to return "true"
   */
  exists: (testSubject: T, count?: number) => boolean;
  /**
   * Pass it a `data-test-subj` and it will return an Enzyme reactWrapper of the node.
   * You can target a nested test subject by separating it with a dot ('.');
   *
   * @param testSubject The data test subject to look for
   *
   * @example
   *
    ```typescript
    find('nameInput');
    // or more specific,
    // "nameInput" is a child of "myForm"
    find('myForm.nameInput');
    ```
   */
  find: (testSubject: T, reactWrapper?: ReactWrapper) => ReactWrapper;
  /**
   * Update the props of the mounted component
   *
   * @param updatedProps The updated prop object
   */
  setProps: (updatedProps: any) => void;
  form: {
    /**
     * Set the value of a form text input.
     *
     * @param input The form input. Can either be a data-test-subj or a reactWrapper (can be a nested path. e.g. "myForm.myInput").
     * @param value The value to set
     */
    setInputValue: (input: T | ReactWrapper, value: string) => void;
    /**
     * Set the value of a <EuiSelect /> or a mocked <EuiSuperSelect />
     * For the <EuiSuperSelect /> you need to mock it like this
     *
     ```typescript
    jest.mock('@elastic/eui', () => {
      const original = jest.requireActual('@elastic/eui');

      return {
        ...original,
        EuiSuperSelect: (props: any) => (
          <input
            data-test-subj={props['data-test-subj'] || 'mockSuperSelect'}
            value={props.valueOfSelected}
            onChange={(e) => {
              props.onChange(e.target.value);
            }}
          />
        ),
      };
    });
     ```
     * @param select The form select. Can either be a data-test-subj or a reactWrapper (can be a nested path. e.g. "myForm.myInput").
     * @param value The value to set
     * @param doUpdateComponent Call component.update() after changing the select value
     */
    setSelectValue: (select: T | ReactWrapper, value: string, doUpdateComponent?: boolean) => void;
    /**
     * Select or unselect a form checkbox.
     *
     * @param dataTestSubject The test subject of the checkbox (can be a nested path. e.g. "myForm.mySelect").
     * @param isChecked Defines if the checkobx is active or not
     */
    selectCheckBox: (checkboxTestSubject: T, isChecked?: boolean) => void;
    /**
     * Toggle the EuiSwitch
     *
     * @param switchTestSubject The test subject of the EuiSwitch (can be a nested path. e.g. "myForm.mySwitch").
     */
    toggleEuiSwitch: (switchTestSubject: T) => void;
    /**
     * The EUI ComboBox is a special input as it needs the ENTER key to be pressed
     * in order to register the value set. This helpers automatically does that.
     *
     * @param comboBoxTestSubject The data test subject of the EuiComboBox (can be a nested path. e.g. "myForm.myComboBox").
     * @param value The value to set
     */
    setComboBoxValue: (comboBoxTestSubject: T, value: string) => void;
    /**
     * Get a list of the form error messages that are visible in the DOM.
     */
    getErrorsMessages: (wrapper?: T | ReactWrapper) => string[];
  };
  table: {
    getMetaData: (tableTestSubject: T) => EuiTableMetaData;
  };
  router: {
    /**
     * Navigate to another React router <Route />
     */
    navigateTo: (url: string) => void;
  };
}

export interface BaseTestBedConfig {
  /** The default props to pass to the mounted component. */
  defaultProps?: Record<string, any>;
  /** Configuration object for the react-router `MemoryRouter. */
  memoryRouter?: MemoryRouterConfig;
  /** An optional redux store. You can also provide a function that returns a store. */
  store?: (() => Store) | Store | null;
}

export interface AsyncTestBedConfig extends BaseTestBedConfig {
  /* Mount the component asynchronously. When using "hooked" components with _useEffect()_ calls, you need to set this to "true". */
  doMountAsync: true;
}

export interface TestBedConfig extends BaseTestBedConfig {
  /* Mount the component asynchronously. When using "hooked" components with _useEffect()_ calls, you need to set this to "true". */
  doMountAsync?: false;
}

export interface MemoryRouterConfig {
  /** Flag to add or not the `MemoryRouter`. If set to `false`, there won't be any router and the component won't be wrapped on a `<Route />`. */
  wrapComponent?: boolean;
  /** The React Router **initial entries** setting ([see documentation](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/MemoryRouter.md)) */
  initialEntries?: LocationDescriptor[];
  /** The React Router **initial index** setting ([see documentation](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/MemoryRouter.md)) */
  initialIndex?: number;
  /** The route **path** for the mounted component (defaults to `"/"`) */
  componentRoutePath?: LocationDescriptor | LocationDescriptor[];
  /** A callBack that will be called with the React Router instance once mounted  */
  onRouter?: (router: any) => void;
}
