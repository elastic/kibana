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
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  AGENT_NAME_FIELD,
  CLOUD_INSTANCE_ID_FIELD,
  CONTAINER_ID_FIELD,
  CONTAINER_NAME_FIELD,
  DURATION_FIELDS,
  EVENT_OUTCOME_FIELD,
  FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT,
  HOST_NAME_FIELD,
  ORCHESTRATOR_CLUSTER_NAME_FIELD,
  ORCHESTRATOR_NAMESPACE_FIELD,
  ORCHESTRATOR_RESOURCE_ID_FIELD,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_NAME_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import { DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import {
  LogDocument,
  ResourceFields,
  TraceFields,
  TraceDocument,
  getAvailableResourceFields,
  getAvailableTraceBadgeFields,
} from '@kbn/discover-utils/src';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from '../cell_actions_popover';
import { ServiceNameBadgeWithActions } from '../service_name_badge_with_actions';
/**
 * getUnformattedResourceFields definitions
 */
export const getUnformattedResourceFields = (doc: LogDocument): Readonly<ResourceFields> => {
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

export const getUnformattedTraceBadgeFields = (doc: TraceDocument): Readonly<TraceFields> => {
  const serviceName = getFieldValue(doc, SERVICE_NAME_FIELD);
  const eventOutcome = getFieldValue(doc, EVENT_OUTCOME_FIELD);
  const agentName = getFieldValue(doc, AGENT_NAME_FIELD);
  const transactionName = getFieldValue(doc, TRANSACTION_NAME_FIELD);
  const transactionDuration = getFieldValue(doc, TRANSACTION_DURATION_FIELD);
  const spanName = getFieldValue(doc, SPAN_NAME_FIELD);
  const spanDuration = getFieldValue(doc, SPAN_DURATION_FIELD);

  return {
    [SERVICE_NAME_FIELD]: serviceName,
    [EVENT_OUTCOME_FIELD]: eventOutcome,
    [AGENT_NAME_FIELD]: agentName,
    [TRANSACTION_NAME_FIELD]: transactionName,
    [TRANSACTION_DURATION_FIELD]: transactionDuration,
    [SPAN_NAME_FIELD]: spanName,
    [SPAN_DURATION_FIELD]: spanDuration,
  };
};

const DurationIcon = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiIcon
      color="hollow"
      type="clock"
      size="m"
      css={css`
        margin-right: ${euiTheme.size.xs};
      `}
    />
  );
};

/**
 * createResourceFields definitions
 */
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export interface ResourceFieldDescriptor {
  ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
  Icon?: () => JSX.Element;
  name: keyof ResourceFields | keyof TraceFields;
  value: string;
}

const getResourceBadgeComponent = (
  name: keyof ResourceFields | keyof TraceFields,
  core: CoreStart,
  share?: SharePluginStart
): React.ComponentType<FieldBadgeWithActionsProps> => {
  if (name === SERVICE_NAME_FIELD) {
    return (props: FieldBadgeWithActionsProps) => (
      <ServiceNameBadgeWithActions {...props} share={share} core={core} />
    );
  }

  return (props: FieldBadgeWithActionsProps) => (
    <FieldBadgeWithActions {...props} share={share} core={core} />
  );
};

const getResourceBadgeIcon = (
  name: keyof ResourceFields | keyof TraceFields,
  fields: Readonly<ResourceFields> | Readonly<TraceFields>
): (() => React.JSX.Element) | undefined => {
  switch (name) {
    case SERVICE_NAME_FIELD:
      return () => {
        const { euiTheme } = useEuiTheme();
        return (
          <AgentIcon
            agentName={fields[AGENT_NAME_FIELD] as AgentName}
            size="m"
            css={css`
              margin-right: ${euiTheme.size.xs};
            `}
          />
        );
      };
    case EVENT_OUTCOME_FIELD:
      return () => {
        const { euiTheme } = useEuiTheme();

        const value = (fields as Readonly<TraceFields>)[name as keyof TraceFields];

        const color = value === 'failure' ? 'danger' : value === 'success' ? 'success' : 'subdued';

        return (
          <EuiIcon
            color={color}
            type="dot"
            size="s"
            css={css`
              margin-right: ${euiTheme.size.xs};
            `}
          />
        );
      };
    case TRANSACTION_DURATION_FIELD:
    case SPAN_DURATION_FIELD:
      return DurationIcon;
  }
};

export const createTraceBadgeFields = (
  row: DataTableRecord,
  dataView: DataView,
  core: CoreStart,
  share?: SharePluginStart
): ResourceFieldDescriptor[] => {
  const traceBadgeFields = getUnformattedTraceBadgeFields(row as TraceDocument);
  const availableFields = getAvailableTraceBadgeFields(traceBadgeFields);

  return availableFields.map((name) => {
    const field = dataView.getFieldByName(name);
    const formatter = field && dataView.getFormatterForField(field);
    const rawValue = traceBadgeFields[name];
    const formattedField = formatter ? formatter.convert(rawValue) : `${rawValue}`;

    return {
      name,
      value: DURATION_FIELDS.includes(name) ? `${formattedField}µs` : formattedField,
      ResourceBadge: getResourceBadgeComponent(name, core, share),
      Icon: getResourceBadgeIcon(name, traceBadgeFields),
    };
  });
};

export const createResourceFields = (
  row: DataTableRecord,
  core: CoreStart,
  share?: SharePluginStart
): ResourceFieldDescriptor[] => {
  const resourceDoc = getUnformattedResourceFields(row as LogDocument);
  const availableResourceFields = getAvailableResourceFields(resourceDoc);

  return availableResourceFields.map((name) => ({
    name,
    value: resourceDoc[name] as string,
    ResourceBadge: getResourceBadgeComponent(name, core, share),
    Icon: getResourceBadgeIcon(name, resourceDoc),
  }));
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
