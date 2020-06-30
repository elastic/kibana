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

import { EuiPageBody } from '@elastic/eui';
import { EuiPageContent } from '@elastic/eui';
import { EuiPageContentBody } from '@elastic/eui';
import { Route, Switch, Redirect, Router, useLocation } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { EuiText } from '@elastic/eui';
import { AppMountParameters } from '../../../src/core/public';

function useQuery() {
  const { search } = useLocation();
  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  return params;
}

interface HelloPageProps {
  firstName: string;
  lastName: string;
}

const HelloPage = ({ firstName, lastName }: HelloPageProps) => (
  <EuiText>{`Hello ${firstName} ${lastName}`}</EuiText>
);

export const Routes: React.FC<{}> = () => {
  const query = useQuery();

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageContentBody>
          <Switch>
            <Route path="/hello">
              <HelloPage
                firstName={query.get('firstName') || ''}
                lastName={query.get('lastName') || ''}
              />
            </Route>
            <Redirect from="/" to="/hello" />
          </Switch>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};

export const LinksExample: React.FC<{
  appBasePath: string;
}> = (props) => {
  const history = React.useMemo(
    () =>
      createBrowserHistory({
        basename: props.appBasePath,
      }),
    [props.appBasePath]
  );
  return (
    <Router history={history}>
      <Routes />
    </Router>
  );
};

export const renderApp = (props: { appBasePath: string }, { element }: AppMountParameters) => {
  ReactDOM.render(<LinksExample {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
