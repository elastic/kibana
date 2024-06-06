/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockManagementPlugin } from '../../../../mocks';
import { ScriptingWarningCallOut } from './warning_call_out';

describe('ScriptingWarningCallOut', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();

  it('should render normally', async () => {
    const component = mountWithI18nProvider(<ScriptingWarningCallOut isVisible={true} />, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    expect(component.render()).toMatchSnapshot();
  });

  it('should render nothing if not visible', async () => {
    const component = mountWithI18nProvider(<ScriptingWarningCallOut isVisible={false} />, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    expect(component).toMatchSnapshot();
  });
});
