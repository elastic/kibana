/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCellActionFactory } from '@kbn/cell-actions/actions';
import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DISCOVER_CELL_ACTIONS_TRIGGER_ID } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { AdditionalCellActionsParams } from '../types';
import {
  type AdditionalCellAction,
  type AdditionalCellActionContext,
  type DiscoverCellAction,
  type DiscoverCellActionExecutionContext,
  type DiscoverCellActionMetadata,
} from '../types';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useProfileAccessor } from './use_profile_accessor';

export const DISCOVER_CELL_ACTION_TYPE = 'discover-cellAction-type';

/**
 * Hook to register additional cell actions based on the resolved profiles
 * @param options Additional cell action options
 * @returns The current cell actions metadata
 */
export const useAdditionalCellActions = ({
  dataSource,
  dataView,
  query,
  filters,
  timeRange,
  extensionActions,
}: Omit<AdditionalCellActionContext, 'field' | 'value'> & {
  extensionActions?: AdditionalCellActionsParams['actions'];
}) => {
  const { uiActions } = useDiscoverServices();
  const [instanceId, setInstanceId] = useState<string | undefined>();
  const getAdditionalCellActionsAccessor = useProfileAccessor('getAdditionalCellActions');
  const additionalCellActions = useMemo(
    () =>
      getAdditionalCellActionsAccessor(() => [])({
        actions: extensionActions ?? {},
      }),
    [extensionActions, getAdditionalCellActionsAccessor]
  );

  useEffect(() => {
    const currentInstanceId = uuidv4();
    const actions = additionalCellActions.map((action, i) =>
      createCellAction(currentInstanceId, action, i)
    );

    actions.forEach((action) => {
      uiActions.registerAction(action);
      uiActions.attachAction(DISCOVER_CELL_ACTIONS_TRIGGER_ID, action.id);
    });

    setInstanceId(currentInstanceId);

    return () => {
      actions.forEach((action) => {
        uiActions.detachAction(DISCOVER_CELL_ACTIONS_TRIGGER_ID, action.id);
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

export const createCellAction = (
  instanceId: string,
  action: AdditionalCellAction,
  order: number
) => {
  const createFactory = createCellActionFactory<DiscoverCellAction>(() => ({
    type: DISCOVER_CELL_ACTION_TYPE,
    getIconType: (context) => action.getIconType(toCellActionContext(context)),
    getDisplayName: (context) => action.getDisplayName(toCellActionContext(context)),
    getDisplayNameTooltip: (context) => action.getDisplayName(toCellActionContext(context)),
    execute: async (context) => action.execute(toCellActionContext(context)),
    isCompatible: async ({ data, metadata }) => {
      if (metadata?.instanceId !== instanceId || data.length !== 1) {
        return false;
      }

      const fieldSpec = data[0]?.field;
      const field = fieldSpec?.name ? metadata.dataView?.fields.create(fieldSpec) : undefined;

      if (!field) {
        return false;
      }

      return action.isCompatible?.({ field, ...metadata }) ?? true;
    },
  }));

  const factory = createFactory();

  return factory({ id: `${action.id}-${uuidv4()}`, order });
};

export const toCellActionContext = ({
  data,
  metadata,
}: DiscoverCellActionExecutionContext): AdditionalCellActionContext => ({
  ...data[0],
  ...metadata,
});
