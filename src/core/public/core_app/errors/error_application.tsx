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

import React, { ReactChild, useState, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import { History } from 'history';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';

import { EuiEmptyPrompt, EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { UrlOverflowUi } from './url_overflow_ui';
import { IBasePath } from '../../http';
import { AppMountParameters } from '../../application';

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
    <EuiPage style={{ minHeight: '100%' }} data-test-subj="appRenderErrorPageContent">
      <EuiPageBody>
        <EuiPageContent verticalPosition="center" horizontalPosition="center">
          <EuiEmptyPrompt
            iconType="alert"
            iconColor="danger"
            title={<h2>{title}</h2>}
            body={children}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
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
export const renderApp = ({ element, history }: AppMountParameters, { basePath }: Deps) => {
  ReactDOM.render(
    <I18nProvider>
      <ErrorApp history={history} basePath={basePath} />
    </I18nProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
