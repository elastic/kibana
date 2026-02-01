/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactChild } from 'react';
import React, { useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import type { History } from 'history';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';

import { EuiPageTemplate } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { IBasePath } from '@kbn/core-http-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';

interface Props {
  title?: string;
  children?: ReactChild;
}

const ErrorPage: React.FC<Props> = ({ title, children }) => {
  title =
    title ??
    i18n.translate('core.application.appRenderError.defaultTitle', {
      defaultMessage: 'Application error',
    });

  return (
    <EuiPageTemplate grow={false} data-test-subj="appRenderErrorPageContent">
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={<h2>{title}</h2>}
        body={children}
      />
    </EuiPageTemplate>
  );
};

const ErrorApp: React.FC<{ basePath: IBasePath; history: History }> = ({ basePath, history }) => {
  const [, setCurrentLocation] = useState(history.location);
  useLayoutEffect(() => {
    return history.listen((location) => setCurrentLocation(location));
  }, [history]);

  return <ErrorPage />;
};

interface Deps {
  basePath: IBasePath;
}

/**
 * Renders UI for displaying error messages.
 * @internal
 */
export const renderApp = ({ element, history, theme$ }: AppMountParameters, { basePath }: Deps) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme={{ theme$ }}>
        <ErrorApp history={history} basePath={basePath} />
      </KibanaThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
