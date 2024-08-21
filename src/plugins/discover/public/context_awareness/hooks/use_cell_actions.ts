/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createCellActionFactory } from '@kbn/cell-actions/actions';
import { useEffect, useMemo, useState } from 'react';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import { uniqueId } from 'lodash';
import type {
  AdditionalCellActionContext,
  DiscoverCellAction,
  DiscoverCellActionExecutionContext,
  DiscoverCellActionMetadata,
} from '../types';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useProfileAccessor } from './use_profile_accessor';

export const DISCOVER_CELL_ACTIONS_TRIGGER: Trigger = { id: 'DISCOVER_CELL_ACTIONS_TRIGGER_ID' };

const DISCOVER_CELL_ACTION_TYPE = 'discover-cellAction-type';

export const useCellActions = ({
  dataSource,
  dataView,
  query,
  filters,
  timeRange,
}: Omit<AdditionalCellActionContext, 'field' | 'value'>) => {
  const { uiActions } = useDiscoverServices();
  const [instanceId, setInstanceId] = useState<string | undefined>();
  const getAdditionalCellActionsAccessor = useProfileAccessor('getAdditionalCellActions');
  const additionalCellActions = useMemo(
    () => getAdditionalCellActionsAccessor(() => [])(),
    [getAdditionalCellActionsAccessor]
  );

  useEffect(() => {
    const currentInstanceId = uniqueId();
    const actions = additionalCellActions.map((action, i) => {
      const createFactory = createCellActionFactory<DiscoverCellAction>(() => ({
        type: DISCOVER_CELL_ACTION_TYPE,
        getIconType: (context) => action.getIconType(toCellActionContext(context)),
        getDisplayName: (context) => action.getDisplayName(toCellActionContext(context)),
        getDisplayNameTooltip: (context) => action.getDisplayName(toCellActionContext(context)),
        execute: async (context) => action.execute(toCellActionContext(context)),
        isCompatible: async ({ data, metadata }) => {
          if (metadata?.instanceId !== currentInstanceId || data.length !== 1) {
            return false;
          }

          const field = data[0]?.field;

          if (!field || !metadata.dataView?.getFieldByName(field.name)) {
            return false;
          }

          return action.isCompatible?.({ field, ...metadata }) ?? true;
        },
      }));

      const factory = createFactory();

      return factory({ id: uniqueId(), order: i });
    });

    actions.forEach((action) => {
      uiActions.registerAction(action);
      uiActions.attachAction(DISCOVER_CELL_ACTIONS_TRIGGER.id, action.id);
    });

    setInstanceId(currentInstanceId);

    return () => {
      actions.forEach((action) => {
        uiActions.detachAction(DISCOVER_CELL_ACTIONS_TRIGGER.id, action.id);
        uiActions.unregisterAction(action.id);
      });

      setInstanceId(undefined);
    };
  }, [additionalCellActions, uiActions]);

  return useMemo<DiscoverCellActionMetadata>(
    () => ({ instanceId, dataSource, dataView, query, filters, timeRange }),
    [dataSource, dataView, filters, instanceId, query, timeRange]
  );
};

const toCellActionContext = ({
  data,
  metadata,
}: DiscoverCellActionExecutionContext): AdditionalCellActionContext => ({
  ...data[0],
  ...metadata,
});
