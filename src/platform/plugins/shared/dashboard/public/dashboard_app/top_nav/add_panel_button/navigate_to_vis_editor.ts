/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HasAppContext } from '@kbn/presentation-publishing';
import type { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  dataService,
  embeddableService,
  usageCollectionService,
} from '../../../services/kibana_services';
import { DASHBOARD_UI_METRIC_ID } from '../../../utils/telemetry_constants';

export function navigateToVisEditor(api: HasAppContext, visType?: BaseVisType | VisTypeAlias) {
  let path = '';
  let appId = '';

  if (visType) {
    const trackUiMetric = usageCollectionService?.reportUiCounter.bind(
      usageCollectionService,
      DASHBOARD_UI_METRIC_ID
    );
    if (trackUiMetric) {
      trackUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
    }

    if (!('alias' in visType)) {
      // this visualization is not an alias
      appId = 'visualize';
      path = `#/create?type=${encodeURIComponent(visType.name)}`;
    } else if (visType.alias && 'path' in visType.alias) {
      // this visualization **is** an alias, and it has an app to redirect to for creation
      appId = visType.alias.app;
      path = visType.alias.path;
    }
  } else {
    appId = 'visualize';
    path = '#/create?';
  }

  const stateTransferService = embeddableService.getStateTransfer();
  stateTransferService.navigateToEditor(appId, {
    path,
    state: {
      originatingApp: api.getAppContext()?.currentAppId,
      originatingPath: api.getAppContext()?.getCurrentPath?.(),
      searchSessionId: dataService.search.session.getSessionId(),
    },
  });
}
