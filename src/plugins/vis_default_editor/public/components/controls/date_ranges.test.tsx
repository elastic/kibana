/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DateRangesParamEditor } from './date_ranges';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import { docLinksServiceMock } from '../../../../../core/public/mocks';

describe('DateRangesParamEditor component', () => {
  let setValue: jest.Mock;
  let setValidity: jest.Mock;
  let setTouched: jest.Mock;
  let defaultProps: any;

  beforeEach(() => {
    setValue = jest.fn();
    setValidity = jest.fn();
    setTouched = jest.fn();

    defaultProps = {
      agg: {},
      aggParam: {
        name: 'ranges',
      },
      value: [],
      editorConfig: {},
      showValidation: false,
      setValue,
      setValidity,
      setTouched,
    };
  });

  function DateRangesWrapped(props: any) {
    const services = {
      docLinks: docLinksServiceMock.createStartContract(),
    };
    return (
      <KibanaContextProvider services={services}>
        <DateRangesParamEditor {...props} />
      </KibanaContextProvider>
    );
  }

  it('should add default range if there is an empty ininitial value', () => {
    mountWithIntl(<DateRangesWrapped {...defaultProps} />);

    expect(setValue).toHaveBeenCalledWith([{}]);
  });

  it('should validate range values with date math', function () {
    const mockedConsoleWarn = jest.spyOn(console, 'warn'); // mocked console.warn to avoid console messages when running tests
    mockedConsoleWarn.mockImplementation(() => {});

    const component = mountWithIntl(<DateRangesWrapped {...defaultProps} />);

    // should allow empty values
    expect(setValidity).toHaveBeenNthCalledWith(1, true);

    component.setProps({ value: [{ from: 'hello, world' }] });
    expect(setValidity).toHaveBeenNthCalledWith(2, false);

    component.setProps({ value: [{ from: 'now' }] });
    expect(setValidity).toHaveBeenNthCalledWith(3, true);

    component.setProps({ value: [{ from: 'now', to: 'Hello, Dan! =)' }] });
    expect(setValidity).toHaveBeenNthCalledWith(4, false);

    component.setProps({ value: [{ from: '2012-02-28' }] });
    expect(setValidity).toHaveBeenNthCalledWith(5, true);

    component.setProps({ value: [{ from: 'now+-5w', to: 'now-3d' }] });
    expect(setValidity).toHaveBeenNthCalledWith(6, false);

    component.setProps({ value: [{ from: 'now-3M/M' }] });
    expect(setValidity).toHaveBeenNthCalledWith(7, true);

    component.setProps({ value: [{ from: '2012-02-31', to: 'now-3d' }] });
    expect(setValidity).toHaveBeenNthCalledWith(8, false);

    component.setProps({ value: [{ to: '2012-05-31||-3M/M' }] });
    expect(setValidity).toHaveBeenNthCalledWith(9, true);

    component.setProps({ value: [{ from: '5/5/2005+3d' }] });
    expect(setValidity).toHaveBeenNthCalledWith(10, false);

    mockedConsoleWarn.mockRestore();
  });
});
