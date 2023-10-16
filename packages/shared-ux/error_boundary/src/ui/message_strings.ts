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
    inline: {
      title: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.inline.text', {
          defaultMessage: 'Error: unable to load',
        }),
    },
    callout: {
      title: () =>
        i18n.translate('sharedUXPackages.error_boundary.fatal.prompt.title', {
          defaultMessage: 'A fatal error was encountered',
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
          defaultMessage: 'Sorry, please refresh',
        }),
      body: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.prompt.body', {
          defaultMessage:
            'An error occurred when trying to load a part of the page. Please try refreshing.',
        }),
      pageReloadButton: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.prompt.pageReloadButton', {
          defaultMessage: 'Refresh',
        }),
    },
    inline: {
      linkText: () =>
        i18n.translate('sharedUXPackages.error_boundary.recoverable.inline.pageReloadButton', {
          defaultMessage: 'Refresh',
        }),
    },
  },
};
