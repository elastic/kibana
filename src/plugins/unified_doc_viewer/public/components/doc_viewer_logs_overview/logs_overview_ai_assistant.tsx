/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { getUnifiedDocViewerServices } from '../../plugin';

export function LogsOverviewAIAssistant({ doc }: { doc: DataTableRecord }) {
  const { discoverShared } = getUnifiedDocViewerServices();

  const logsAIAssistantFeature = discoverShared.features.registry.getById(
    'observability-logs-ai-assistant'
  );

  if (!logsAIAssistantFeature) {
    return null;
  }

  return logsAIAssistantFeature.render({ doc });
}
