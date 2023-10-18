/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const errorMessageStrings = {
  fatal: {
    callout: {
      title: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.title', {
          defaultMessage: 'Error encountered',
        }),
      body: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.body', {
          defaultMessage: 'Try refreshing this page.',
        }),
      showDetailsButton: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.detailButton', {
          defaultMessage: 'Show details',
        }),
      details: {
        componentName: (errorComponentName: string) =>
          i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.details', {
            defaultMessage: 'An error occurred in {name}:',
            values: { name: errorComponentName },
          }),
        title: () =>
          i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.details.title', {
            defaultMessage: 'Error details',
          }),
      },
      pageReloadButton: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.pageReloadButton', {
          defaultMessage: 'Refresh',
        }),
    },
  },
  recoverable: {
    callout: {
      title: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.prompt.title', {
          defaultMessage: 'Please refresh the page',
        }),
      body: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.prompt.body', {
          defaultMessage:
            'A part of this page encountered an issue loading. Please refresh this page in your browser to correct this issue.',
        }),
      pageReloadButton: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.prompt.pageReloadButton', {
          defaultMessage: 'Refresh',
        }),
    },
  },
};
