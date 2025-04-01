/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { EuiPageBody, EuiPageTemplate, EuiPageSection, EuiText } from '@elastic/eui';
import { Redirect, useLocation } from 'react-router-dom';
import { Router, Routes as RouterRoutes, Route } from '@kbn/shared-ux-router';
import { createBrowserHistory } from 'history';
import { AppMountParameters } from '@kbn/core/public';

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
      <EuiPageTemplate.Section>
        <EuiPageSection>
          <RouterRoutes>
            <Route path="/hello">
              <HelloPage
                firstName={query.get('firstName') || ''}
                lastName={query.get('lastName') || ''}
              />
            </Route>
            <Redirect from="/" to="/hello" />
          </RouterRoutes>
        </EuiPageSection>
      </EuiPageTemplate.Section>
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
