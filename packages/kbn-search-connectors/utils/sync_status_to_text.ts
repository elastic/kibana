/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { SyncJobType, SyncStatus } from '..';

export function syncStatusToText(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.COMPLETED:
      return i18n.translate('searchConnectors.syncStatus.completed', {
        defaultMessage: 'Sync complete',
      });
    case SyncStatus.ERROR:
      return i18n.translate('searchConnectors.syncStatus.error', {
        defaultMessage: 'Sync failure',
      });
    case SyncStatus.IN_PROGRESS:
      return i18n.translate('searchConnectors.syncStatus.inProgress', {
        defaultMessage: 'Sync in progress',
      });
    case SyncStatus.CANCELED:
      return i18n.translate('searchConnectors.syncStatus.canceling', {
        defaultMessage: 'Sync canceled',
      });
    case SyncStatus.CANCELING:
      return i18n.translate('searchConnectors.syncStatus.canceled', {
        defaultMessage: 'Canceling sync',
      });
    case SyncStatus.PENDING:
      return i18n.translate('searchConnectors.syncStatus.pending', {
        defaultMessage: 'Sync pending',
      });
    case SyncStatus.SUSPENDED:
      return i18n.translate('searchConnectors.syncStatus.suspended', {
        defaultMessage: 'Sync suspended',
      });
    default:
      return status;
  }
}

export function syncStatusToColor(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.COMPLETED:
      return 'success';
    case SyncStatus.ERROR:
    case SyncStatus.CANCELED:
      return 'danger';
    case SyncStatus.IN_PROGRESS:
    case SyncStatus.PENDING:
    case SyncStatus.SUSPENDED:
    case SyncStatus.CANCELING:
      return 'warning';
    default:
      return 'default';
  }
}

export const syncJobTypeToText = (syncType: SyncJobType): string => {
  switch (syncType) {
    case SyncJobType.FULL:
      return i18n.translate('searchConnectors.syncJobType.full', {
        defaultMessage: 'Full content',
      });
    case SyncJobType.INCREMENTAL:
      return i18n.translate('searchConnectors.syncJobType.incremental', {
        defaultMessage: 'Incremental content',
      });
    default:
      return '';
  }
};
