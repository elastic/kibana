/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const NavEmbeddableStrings = {
  component: {
    getAddButtonLabel: () =>
      i18n.translate('navEmbeddable.editor.addButtonLabel', {
        defaultMessage: 'Add link',
      }),
  },
  editor: {
    getLinkTypePickerLabel: () =>
      i18n.translate('navEmbeddable.editor.linkTypeFormLabel', {
        defaultMessage: 'Go to',
      }),
    getLinkDestinationLabel: () =>
      i18n.translate('navEmbeddable.editor.linkDestinationLabel', {
        defaultMessage: 'Choose destination',
      }),
    getLinkTextLabel: () =>
      i18n.translate('navEmbeddable.editor.linkTextLabel', {
        defaultMessage: 'Text',
      }),
    getLinkTextPlaceholder: () =>
      i18n.translate('navEmbeddable.editor.linkTextPlaceholder', {
        defaultMessage: 'Enter text for link',
      }),
    dashboard: {
      getLinkTypeLabel: () =>
        i18n.translate('navEmbeddable.editor.dashboard.linkTypeLabel', {
          defaultMessage: 'Dashboard',
        }),
      getSearchPlaceholder: () =>
        i18n.translate('navEmbeddable.editor.dashboard.searchPlaceholder', {
          defaultMessage: 'Search for a dashboard',
        }),
      getCurrentDashboardLabel: () =>
        i18n.translate('navEmbeddable.editor.dashboard.currentDashboardLabel', {
          defaultMessage: 'Current',
        }),
    },
    external: {
      getLinkTypeLabel: () =>
        i18n.translate('navEmbeddable.editor.external.linkTypeLabel', {
          defaultMessage: 'URL',
        }),
      getPlaceholder: () =>
        i18n.translate('navEmbeddable.editor.external.placeholder', {
          defaultMessage: 'Enter external URL',
        }),
    },
  },
};
