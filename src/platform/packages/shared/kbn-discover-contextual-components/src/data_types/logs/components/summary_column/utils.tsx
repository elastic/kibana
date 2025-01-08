/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { css } from '@emotion/react';
import { AgentName } from '@kbn/elastic-agent-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  AGENT_NAME_FIELD,
  CLOUD_INSTANCE_ID_FIELD,
  CONTAINER_ID_FIELD,
  CONTAINER_NAME_FIELD,
  FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT,
  HOST_NAME_FIELD,
  ORCHESTRATOR_CLUSTER_NAME_FIELD,
  ORCHESTRATOR_NAMESPACE_FIELD,
  ORCHESTRATOR_RESOURCE_ID_FIELD,
  SERVICE_NAME_FIELD,
} from '@kbn/discover-utils';
import { DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { LogDocument, ResourceFields, getAvailableResourceFields } from '@kbn/discover-utils/src';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from '../cell_actions_popover';
import { ServiceNameBadgeWithActions } from '../service_name_badge_with_actions';
/**
 * getUnformattedResourceFields definitions
 */
export const getUnformattedResourceFields = (doc: LogDocument): ResourceFields => {
  const serviceName = getFieldValue(doc, SERVICE_NAME_FIELD);
  const hostName = getFieldValue(doc, HOST_NAME_FIELD);
  const agentName = getFieldValue(doc, AGENT_NAME_FIELD);
  const orchestratorClusterName = getFieldValue(doc, ORCHESTRATOR_CLUSTER_NAME_FIELD);
  const orchestratorResourceId = getFieldValue(doc, ORCHESTRATOR_RESOURCE_ID_FIELD);
  const orchestratorNamespace = getFieldValue(doc, ORCHESTRATOR_NAMESPACE_FIELD);
  const containerName = getFieldValue(doc, CONTAINER_NAME_FIELD);
  const containerId = getFieldValue(doc, CONTAINER_ID_FIELD);
  const cloudInstanceId = getFieldValue(doc, CLOUD_INSTANCE_ID_FIELD);

  return {
    [SERVICE_NAME_FIELD]: serviceName,
    [HOST_NAME_FIELD]: hostName,
    [AGENT_NAME_FIELD]: agentName,
    [ORCHESTRATOR_CLUSTER_NAME_FIELD]: orchestratorClusterName,
    [ORCHESTRATOR_RESOURCE_ID_FIELD]: orchestratorResourceId,
    [ORCHESTRATOR_NAMESPACE_FIELD]: orchestratorNamespace,
    [CONTAINER_NAME_FIELD]: containerName,
    [CONTAINER_ID_FIELD]: containerId,
    [CLOUD_INSTANCE_ID_FIELD]: cloudInstanceId,
  };
};

/**
 * createResourceFields definitions
 */
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const resourceCustomComponentsMap: Partial<
  Record<keyof ResourceFields, React.ComponentType<FieldBadgeWithActionsProps>>
> = {
  [SERVICE_NAME_FIELD]: ServiceNameBadgeWithActions,
};

export interface ResourceFieldDescriptor {
  ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
  Icon?: () => JSX.Element;
  name: keyof ResourceFields;
  value: string;
}

export const createResourceFields = (
  row: DataTableRecord,
  core: CoreStart,
  share?: SharePluginStart
): ResourceFieldDescriptor[] => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);

  const availableResourceFields = getAvailableResourceFields(resourceDoc);

  const resourceFields = availableResourceFields.map((name) => {
    const ResourceBadgeComponent = resourceCustomComponentsMap[name] ?? FieldBadgeWithActions;
    const resourceBadgeComponentWithDependencies = (props: FieldBadgeWithActionsProps) => (
      <ResourceBadgeComponent {...props} share={share} core={core} />
    );
    return {
      name,
      value: resourceDoc[name] as string,
      ResourceBadge: resourceBadgeComponentWithDependencies,
      ...(name === SERVICE_NAME_FIELD && {
        Icon: () => (
          <AgentIcon
            agentName={resourceDoc[AGENT_NAME_FIELD] as AgentName}
            size="m"
            css={css`
              margin-right: ${euiThemeVars.euiSizeXS};
            `}
          />
        ),
      }),
    };
  });

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
  !FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) => field.startsWith(prefix));
