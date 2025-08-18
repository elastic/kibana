/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const discoverListingTableStrings = {
  getEntityName: () =>
    i18n.translate('discover.listing.table.entityName', {
      defaultMessage: 'Discover session',
    }),
  getEntityNamePlural: () =>
    i18n.translate('discover.listing.table.entityNamePlural', {
      defaultMessage: 'Discover sessions',
    }),
  getTableListTitle: () =>
    i18n.translate('discover.listing.table.title', {
      defaultMessage: 'Discover',
    }),
};

export const discoverListingErrorStrings = {
  getErrorDeletingSearchToast: () =>
    i18n.translate('discover.listing.deleteError.toastTitle', {
      defaultMessage: 'Error deleting Discover session',
    }),
  getErrorUpdatingSearchToast: () =>
    i18n.translate('discover.listing.updateError.toastTitle', {
      defaultMessage: 'Error updating Discover session',
    }),
  getDuplicateTitleWarning: (title: string) =>
    i18n.translate('discover.listing.duplicateTitle.warning', {
      defaultMessage: 'A Discover session with the title "{title}" already exists',
      values: { title },
    }),
};

