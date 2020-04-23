/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { EuiPage } from '@elastic/eui';

import { BrowserRouter as Router, Route } from 'react-router-dom';
import { AppMountParameters } from '../../../src/core/public';
import { GreetingCardCreator } from './greeting_card_creator';
import { GreetingCardViewer } from './greeting_card_viewer';
import { Services } from './services';

interface Props {
  appBasePath: string;
  services: Services;
}

function GreetingCardApp({ appBasePath, services }: Props) {
  return (
    <Router basename={appBasePath}>
      <EuiPage>
        <Route
          path={`/`}
          exact={true}
          render={() => {
            services.showChrome();
            return <GreetingCardCreator />;
          }}
        />
        <Route
          path={`/view`}
          exact={true}
          render={() => {
            services.hideChrome();
            return <GreetingCardViewer />;
          }}
        />
      </EuiPage>
    </Router>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<GreetingCardApp {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
