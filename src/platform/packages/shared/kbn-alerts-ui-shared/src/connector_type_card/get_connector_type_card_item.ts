/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '@kbn/actions-types';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { ActionTypeRegistryContract } from '../common/types';

export interface ConnectorTypeCardItem {
  actionType: ActionType;
  iconClass: IconType;
  name: string;
  selectMessage: string;
  isExperimental?: boolean;
  isDeprecated: boolean;
}

export const getConnectorIcon = (id: string): IconType => ConnectorIconsMap.get(id) ?? 'plugs';

export const getConnectorTypeCardItem = ({
  actionType,
  actionTypeRegistry,
}: {
  actionType: ActionType;
  actionTypeRegistry: Pick<ActionTypeRegistryContract, 'has' | 'get'>;
}): ConnectorTypeCardItem => {
  if (actionType.source === ACTION_TYPE_SOURCES.spec) {
    return {
      iconClass: getConnectorIcon(actionType.id),
      selectMessage: actionType.description ?? '',
      actionType,
      name: actionType.name,
      isExperimental: actionType.isExperimental ?? false,
      isDeprecated: actionType.isDeprecated,
    };
  }
  const model = actionTypeRegistry.has(actionType.id)
    ? actionTypeRegistry.get(actionType.id)
    : undefined;
  return {
    iconClass: model ? model.iconClass : '',
    selectMessage: model ? model.selectMessage : '',
    actionType,
    name: actionType.name,
    isExperimental: model?.isExperimental,
    isDeprecated: actionType.isDeprecated,
  };
};
