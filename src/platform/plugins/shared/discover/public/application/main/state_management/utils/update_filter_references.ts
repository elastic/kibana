/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UPDATE_FILTER_REFERENCES_ACTION } from '@kbn/unified-search-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { UPDATE_FILTER_REFERENCES_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DiscoverServices } from '../../../../build_services';

export const updateFiltersReferences = async ({
  prevDataView,
  nextDataView,
  services: { uiActions },
}: {
  prevDataView: DataView;
  nextDataView: DataView;
  services: DiscoverServices;
}) => {
  const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
  const action = await uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);
  action?.execute({
    trigger,
    fromDataView: prevDataView.id,
    toDataView: nextDataView.id,
    usedDataViews: [],
  } as ActionExecutionContext);
};
