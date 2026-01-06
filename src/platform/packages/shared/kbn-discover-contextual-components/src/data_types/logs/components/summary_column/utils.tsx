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
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  AGENT_NAME_FIELD,
  DATASTREAM_TYPE_FIELD,
  EVENT_OUTCOME_FIELD,
  FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  TRANSACTION_DURATION_FIELD,
  getFieldValue,
  INDEX_FIELD,
  FILTER_OUT_EXACT_FIELDS_FOR_CONTENT,
  TRANSACTION_NAME_FIELD,
  OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  getAvailableResourceFields,
  RESOURCE_FIELDS,
} from '@kbn/discover-utils';
import type { TraceDocument } from '@kbn/discover-utils/src';
import { formatFieldValue } from '@kbn/discover-utils/src';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldBadgeWithActionsProps } from '../cell_actions_popover';
import { FieldBadgeWithActions } from '../cell_actions_popover';
import { TransactionNameIcon } from './icons/transaction_name_icon';

type FieldKey = keyof DataTableRecord['flattened'];
type FieldValue = NonNullable<DataTableRecord['flattened'][FieldKey]>;

/**
 * Takes a `DataTableRecord` compatible document, and then with an array
 * of field names, constructs an object containing extracted data from the
 * `DataTableRecord`, excluding all `undefined`/`null` cases.
 */
const getUnformattedFields = (
  doc: DataTableRecord,
  fields: readonly FieldKey[]
): Readonly<Record<FieldKey, FieldValue>> =>
  fields.reduce((acc, field) => {
    const fieldValue = getFieldValue(doc, field);

    if (fieldValue != null) {
      acc[field] = fieldValue;
    }

    return acc;
  }, {} as Record<FieldKey, FieldValue>);

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

const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

const EventOutcomeBadge = (props: FieldBadgeWithActionsProps) =>
  props.rawValue === 'failure' ? <FieldBadgeWithActions {...props} color="danger" /> : null;

export interface ResourceFieldDescriptor {
  ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
  Icon?: () => JSX.Element;
  name: string;
  value: string;
  property?: DataViewField;
  rawValue: unknown;
}

const getResourceBadgeComponent = (
  name: FieldKey,
  core: CoreStart,
  share?: SharePluginStart
): React.ComponentType<FieldBadgeWithActionsProps> => {
  switch (name) {
    case EVENT_OUTCOME_FIELD:
      return EventOutcomeBadge;
    default:
      return FieldBadgeWithActions;
  }
};

const getResourceBadgeIcon = (
  name: FieldKey,
  fields: Readonly<Record<FieldKey, FieldValue>>
): (() => React.JSX.Element) | undefined => {
  switch (name) {
    case SERVICE_NAME_FIELD:
      return () => {
        const { euiTheme } = useEuiTheme();
        const agentName = (fields[OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE] ||
          fields[AGENT_NAME_FIELD]) as AgentName;

        return (
          <AgentIcon
            agentName={agentName}
            size="m"
            css={css`
              margin-right: ${euiTheme.size.xs};
            `}
          />
        );
      };
    case TRANSACTION_DURATION_FIELD:
    case SPAN_DURATION_FIELD:
      return DurationIcon;
    case TRANSACTION_NAME_FIELD:
      return () => TransactionNameIcon(fields[AGENT_NAME_FIELD] as AgentName);
  }
};

const isTracesIndex = testPatternAgainstAllowedList(['traces']);

export const isTraceDocument = (row: DataTableRecord): row is TraceDocument =>
  getFieldValue(row, DATASTREAM_TYPE_FIELD) === 'traces' ||
  isTracesIndex(getFieldValue(row, INDEX_FIELD) as string);

interface ResourceFieldsProps {
  row: DataTableRecord;
  fields: readonly FieldKey[];
  getAvailableFields: (doc: Readonly<Record<FieldKey, FieldValue>>) => FieldKey[];
  dataView: DataView;
  core: CoreStart;
  share?: SharePluginStart;
  fieldFormats: FieldFormatsStart;
}

export const createResourceFields = ({
  row,
  fields,
  getAvailableFields,
  dataView,
  core,
  share,
  fieldFormats,
}: ResourceFieldsProps): ResourceFieldDescriptor[] => {
  const resourceDoc = getUnformattedFields(row, fields);
  const availableResourceFields = getAvailableFields(resourceDoc);

  return availableResourceFields.map((name) => {
    const property = dataView.getFieldByName(name);
    const value = formatFieldValue(
      resourceDoc[name],
      row.raw,
      fieldFormats,
      dataView,
      property,
      'html'
    );

    return {
      name,
      rawValue: resourceDoc[name],
      value,
      property,
      ResourceBadge: getResourceBadgeComponent(name, core, share),
      Icon: getResourceBadgeIcon(name, resourceDoc),
    };
  });
};

/**
 * Enhanced version that uses OTel field fallbacks and returns resource fields with actual field names.
 * This ensures badges display the correct field names (e.g., 'resource.attributes.service.name'
 * instead of 'service.name' when the document uses OTel format).
 */
export const createResourceFieldsWithOtelFallback = ({
  row,
  dataView,
  core,
  share,
  fieldFormats,
}: Omit<ResourceFieldsProps, 'fields' | 'getAvailableFields'>): ResourceFieldDescriptor[] => {
  const resourceDoc = getUnformattedFields(row, RESOURCE_FIELDS);
  const availableFields = getAvailableResourceFields(row.flattened);

  return availableFields.map((name) => {
    const property = dataView.getFieldByName(name);
    const rawValue = row.flattened[name];
    const value = formatFieldValue(rawValue, row.raw, fieldFormats, dataView, property, 'html');

    return {
      name,
      rawValue,
      value,
      property,
      ResourceBadge: getResourceBadgeComponent(name, core, share),
      Icon: getResourceBadgeIcon(name, resourceDoc),
    };
  });
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

export const isFieldAllowed = (field: string): boolean => {
  const isExactMatchExcluded = FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(field);
  const isPrefixMatchExcluded = FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) =>
    field.startsWith(prefix)
  );

  return !isExactMatchExcluded && !isPrefixMatchExcluded;
};
