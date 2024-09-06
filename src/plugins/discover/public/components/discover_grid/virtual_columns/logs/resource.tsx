/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import { LogDocument, ResourceFields } from '@kbn/discover-utils/src';
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import * as constants from '../../../../../common/data_types/logs/constants';
import { getUnformattedResourceFields } from './utils/resource';
import { FieldBadgeWithActions } from '../../../data_types/logs/cell_actions_popover';

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const MAX_LIMITED_FIELDS_VISIBLE = 2;

interface ResourceProps extends DataGridCellValueElementProps {
  limited?: boolean;
}

export const Resource = ({ row, limited = false }: ResourceProps) => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);

  const resourceFields: Array<{ name: keyof ResourceFields; Icon?: React.FC }> = [
    {
      name: constants.SERVICE_NAME_FIELD,
      Icon: () =>
        resourceDoc[constants.AGENT_NAME_FIELD] ? (
          <AgentIcon agentName={resourceDoc[constants.AGENT_NAME_FIELD] as AgentName} size="m" />
        ) : null,
    },
    { name: constants.CONTAINER_NAME_FIELD },
    { name: constants.HOST_NAME_FIELD },
    { name: constants.ORCHESTRATOR_NAMESPACE_FIELD },
    { name: constants.CLOUD_INSTANCE_ID_FIELD },
  ];

  const existingFields = resourceFields.filter(({ name }) => Boolean(resourceDoc[name]));

  const displayedFields = limited
    ? existingFields.slice(0, MAX_LIMITED_FIELDS_VISIBLE)
    : existingFields;
  const extraFieldsCount = limited ? existingFields.length - MAX_LIMITED_FIELDS_VISIBLE : 0;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" css={{ height: '100%' }}>
      {displayedFields.map(({ name, Icon }) => (
        <FieldBadgeWithActions property={name} text={resourceDoc[name] as string} icon={Icon} />
      ))}
      {extraFieldsCount > 0 && (
        <div>
          <EuiBadge>+{extraFieldsCount}</EuiBadge>
        </div>
      )}
    </EuiFlexGroup>
  );
};
