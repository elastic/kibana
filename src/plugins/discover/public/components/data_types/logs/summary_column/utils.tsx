/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue, LogDocument, ResourceFields } from '@kbn/discover-utils/src';
import { DataTableRecord } from '@kbn/discover-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { css } from '@emotion/react';
import { AgentName } from '@kbn/elastic-agent-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { getAvailableResourceFields } from '../../../../utils/get_available_resource_fields';
import * as constants from '../../../../../common/data_types/logs/constants';
import { ServiceNameBadgeWithActions } from '../service_name_badge_with_actions';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from '../cell_actions_popover';

/**
 * getUnformattedResourceFields definitions
 */
export const getUnformattedResourceFields = (doc: LogDocument): ResourceFields => {
  const serviceName = getFieldValue(doc, constants.SERVICE_NAME_FIELD);
  const hostName = getFieldValue(doc, constants.HOST_NAME_FIELD);
  const agentName = getFieldValue(doc, constants.AGENT_NAME_FIELD);
  const orchestratorClusterName = getFieldValue(doc, constants.ORCHESTRATOR_CLUSTER_NAME_FIELD);
  const orchestratorResourceId = getFieldValue(doc, constants.ORCHESTRATOR_RESOURCE_ID_FIELD);
  const orchestratorNamespace = getFieldValue(doc, constants.ORCHESTRATOR_NAMESPACE_FIELD);
  const containerName = getFieldValue(doc, constants.CONTAINER_NAME_FIELD);
  const containerId = getFieldValue(doc, constants.CONTAINER_ID_FIELD);
  const cloudInstanceId = getFieldValue(doc, constants.CLOUD_INSTANCE_ID_FIELD);

  return {
    [constants.SERVICE_NAME_FIELD]: serviceName,
    [constants.HOST_NAME_FIELD]: hostName,
    [constants.AGENT_NAME_FIELD]: agentName,
    [constants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: orchestratorClusterName,
    [constants.ORCHESTRATOR_RESOURCE_ID_FIELD]: orchestratorResourceId,
    [constants.ORCHESTRATOR_NAMESPACE_FIELD]: orchestratorNamespace,
    [constants.CONTAINER_NAME_FIELD]: containerName,
    [constants.CONTAINER_ID_FIELD]: containerId,
    [constants.CLOUD_INSTANCE_ID_FIELD]: cloudInstanceId,
  };
};

/**
 * createResourceFields definitions
 */
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const resourceCustomComponentsMap: Partial<
  Record<keyof ResourceFields, React.ComponentType<FieldBadgeWithActionsProps>>
> = {
  [constants.SERVICE_NAME_FIELD]: ServiceNameBadgeWithActions,
};

export interface ResourceFieldDescriptor {
  ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
  Icon?: () => JSX.Element;
  name: keyof ResourceFields;
  value: string;
}

export const createResourceFields = (row: DataTableRecord): ResourceFieldDescriptor[] => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);

  const availableResourceFields = getAvailableResourceFields(resourceDoc);

  const resourceFields = availableResourceFields.map((name) => ({
    name,
    value: resourceDoc[name] as string,
    ResourceBadge: resourceCustomComponentsMap[name] ?? FieldBadgeWithActions,
    ...(name === constants.SERVICE_NAME_FIELD && {
      Icon: () => (
        <AgentIcon
          agentName={resourceDoc[constants.AGENT_NAME_FIELD] as AgentName}
          size="m"
          css={css`
            margin-right: ${euiThemeVars.euiSizeXS};
          `}
        />
      ),
    }),
  }));

  return resourceFields;
};

/**
 * formatJsonDocumentForContent definitions
 */
export const formatJsonDocumentForContent = (row: DataTableRecord) => {
  const flattenedResult: DataTableRecord['flattened'] = {};
  const rawFieldResult: DataTableRecord['raw']['fields'] = {};
  const { raw, flattened } = row;
  const { fields } = raw;

  // We need 2 loops here for flattened and raw.fields. Flattened contains all fields,
  // whereas raw.fields only contains certain fields excluding _ignored
  for (const fieldName in flattened) {
    if (isFieldAllowed(fieldName) && flattened[fieldName]) {
      flattenedResult[fieldName] = flattened[fieldName];
    }
  }

  for (const fieldName in fields) {
    if (isFieldAllowed(fieldName) && fields[fieldName]) {
      rawFieldResult[fieldName] = fields[fieldName];
    }
  }

  return {
    ...row,
    flattened: flattenedResult,
    raw: {
      ...raw,
      fields: rawFieldResult,
    },
  };
};

const isFieldAllowed = (field: string) =>
  !constants.FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) => field.startsWith(prefix));
