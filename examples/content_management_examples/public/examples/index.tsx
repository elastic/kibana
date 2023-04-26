/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { EuiPageTemplate } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { StartDeps } from '../types';
import { TodoApp } from './todos';

export const renderApp = (
  { notifications }: CoreStart,
  { contentManagement }: StartDeps,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Section>
        <TodoApp contentClient={contentManagement.client} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
