/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactChild, useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import type { History } from 'history';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';

import { EuiPageTemplate } from '@elastic/eui';
import { CoreThemeProvider } from '@kbn/core-theme-browser-internal';
import type { IBasePath } from '@kbn/core-http-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
import { UrlOverflowUi } from './url_overflow_ui';

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
    <EuiPageTemplate data-test-subj="appRenderErrorPageContent">
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
  const [currentLocation, setCurrentLocation] = useState(history.location);
  useLayoutEffect(() => {
    return history.listen((location) => setCurrentLocation(location));
  }, [history]);

  const searchParams = new URLSearchParams(currentLocation.search);
  const errorType = searchParams.get('errorType');

  if (errorType === 'urlOverflow') {
    return (
      <ErrorPage
        title={i18n.translate('core.ui.errorUrlOverflow.errorTitle', {
          defaultMessage: "The URL for this object is too long, and we can't display it",
        })}
      >
        <UrlOverflowUi basePath={basePath} />
      </ErrorPage>
    );
  }

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
      <CoreThemeProvider theme$={theme$}>
        <ErrorApp history={history} basePath={basePath} />
      </CoreThemeProvider>
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
