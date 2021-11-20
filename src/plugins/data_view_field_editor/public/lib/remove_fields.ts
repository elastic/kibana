/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { NotificationsStart } from 'src/core/public';
import { IndexPattern, UsageCollectionStart } from '../shared_imports';
import { pluginName } from '../constants';
import { DataPublicPluginStart } from '../../../data/public';

export async function removeFields(
  fieldNames: string[],
  indexPattern: IndexPattern,
  services: {
    indexPatternService: DataPublicPluginStart['indexPatterns'];
    usageCollection: UsageCollectionStart;
    notifications: NotificationsStart;
  }
) {
  fieldNames.forEach((fieldName) => {
    indexPattern.removeRuntimeField(fieldName);
  });

  try {
    services.usageCollection.reportUiCounter(pluginName, METRIC_TYPE.COUNT, 'delete_runtime');
    // eslint-disable-next-line no-empty
  } catch {}

  try {
    await services.indexPatternService.updateSavedObject(indexPattern);
  } catch (e) {
    const title = i18n.translate('indexPatternFieldEditor.save.deleteErrorTitle', {
      defaultMessage: 'Failed to save field removal',
    });
    services.notifications.toasts.addError(e, { title });
  }
}
