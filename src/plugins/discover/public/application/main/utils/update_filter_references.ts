/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DiscoverServices } from '../../../build_services';

export const updateFiltersReferences = ({
  prevDataView,
  nextDataView,
  services: { uiActions },
}: {
  prevDataView: DataView;
  nextDataView: DataView;
  services: DiscoverServices;
}) => {
  const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
  const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);
  action?.execute({
    trigger,
    fromDataView: prevDataView.id,
    toDataView: nextDataView.id,
    usedDataViews: [],
  } as ActionExecutionContext);
};
