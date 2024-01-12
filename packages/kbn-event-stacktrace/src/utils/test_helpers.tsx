/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mount, MountRendererProps } from 'enzyme';

export function renderWithTheme(
  component: React.ReactNode,
  params?: any,
  { darkMode = false } = {}
) {
  return render(<EuiThemeProvider darkMode={darkMode}>{component}</EuiThemeProvider>, params);
}

export function mountWithTheme(tree: React.ReactElement<any>, { darkMode = false } = {}) {
  function WrappingThemeProvider(props: any) {
    return <EuiThemeProvider darkMode={darkMode}>{props.children}</EuiThemeProvider>;
  }

  return mount(tree, {
    wrappingComponent: WrappingThemeProvider,
  } as MountRendererProps);
}
