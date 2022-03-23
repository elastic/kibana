/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { History } from 'history';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import ReactDOM from 'react-dom';

import { ApplicationStart, HttpStart, ToastsSetup } from 'kibana/public';
import type { ThemeServiceStart } from '../../../../core/public';
import { SavedObjectNotFound } from '..';
import { KibanaThemeProvider } from '../theme';

const ReactMarkdown = React.lazy(() => import('react-markdown'));
const ErrorRenderer = (props: { children: string }) => (
  <React.Suspense fallback={<EuiLoadingSpinner />}>
    <ReactMarkdown renderers={{ root: Fragment }} {...props} />
  </React.Suspense>
);

interface Mapping {
  [key: string]: string | { app: string; path: string };
}

function addNotFoundToPath(path: string, error: SavedObjectNotFound) {
  return (
    path +
    (path.indexOf('?') >= 0 ? '&' : '?') +
    `notFound=${error.savedObjectType}&notFoundMessage=${error.message}`
  );
}

/**
 * Creates an error handler that will redirect to a url when a SavedObjectNotFound
 * error is thrown
 */
export function redirectWhenMissing({
  history,
  navigateToApp,
  basePath,
  mapping,
  toastNotifications,
  onBeforeRedirect,
  theme,
}: {
  history: History;
  navigateToApp: ApplicationStart['navigateToApp'];
  basePath: HttpStart['basePath'];
  /**
   * a mapping of url's to redirect to based on the saved object that
   * couldn't be found, or just a string that will be used for all types
   */
  mapping: string | Mapping;
  /**
   * Toast notifications service to show toasts in error cases.
   */
  toastNotifications: ToastsSetup;
  /**
   * Optional callback invoked directly before a redirect is triggered
   */
  onBeforeRedirect?: (error: SavedObjectNotFound) => void;
  theme: ThemeServiceStart;
}) {
  let localMappingObject: Mapping;

  if (typeof mapping === 'string') {
    localMappingObject = { '*': mapping };
  } else {
    localMappingObject = mapping;
  }

  return (error: SavedObjectNotFound) => {
    // if this error is not "404", rethrow
    // we can't check "error instanceof SavedObjectNotFound" since this class can live in a separate bundle
    // and the error will be an instance of other class with the same interface (actually the copy of SavedObjectNotFound class)
    if (!error.savedObjectType) {
      throw error;
    }

    let redirectTarget =
      localMappingObject[error.savedObjectType] || localMappingObject['*'] || '/';
    if (typeof redirectTarget !== 'string') {
      redirectTarget.path = addNotFoundToPath(redirectTarget.path, error);
    } else {
      redirectTarget = addNotFoundToPath(redirectTarget, error);
    }

    toastNotifications.addWarning({
      title: i18n.translate('kibana_utils.history.savedObjectIsMissingNotificationMessage', {
        defaultMessage: 'Saved object is missing',
      }),
      text: (element: HTMLElement) => {
        ReactDOM.render(
          <KibanaThemeProvider theme$={theme.theme$}>
            <ErrorRenderer>{error.message}</ErrorRenderer>
          </KibanaThemeProvider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    if (onBeforeRedirect) {
      onBeforeRedirect(error);
    }
    if (typeof redirectTarget !== 'string') {
      if (redirectTarget.app === 'kibana') {
        // exception for kibana app because redirect won't work right otherwise
        window.location.href = basePath.prepend(`/app/kibana${redirectTarget.path}`);
      } else {
        navigateToApp(redirectTarget.app, { path: redirectTarget.path });
      }
    } else {
      history.replace(redirectTarget);
    }
  };
}
