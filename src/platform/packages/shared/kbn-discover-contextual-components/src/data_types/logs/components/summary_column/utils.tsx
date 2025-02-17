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
  DATASTREAM_TYPE_FIELD,
  EVENT_OUTCOME_FIELD,
  FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  TRANSACTION_DURATION_FIELD,
  DataTableRecord,
  getFieldValue,
  INDEX_FIELD,
} from '@kbn/discover-utils';
import { TraceDocument, formatFieldValue } from '@kbn/discover-utils/src';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { testPatternAgainstAllowedList } from '@kbn/data-view-utils';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from '../cell_actions_popover';
import { ServiceNameBadgeWithActions } from '../service_name_badge_with_actions';

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

/**
 * createResourceFields definitions
 */
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export interface ResourceFieldDescriptor {
  ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
  Icon?: () => JSX.Element;
  name: string;
  value: string;
  rawValue: unknown;
}

const getResourceBadgeComponent = (
  name: FieldKey,
  core: CoreStart,
  share?: SharePluginStart
): React.ComponentType<FieldBadgeWithActionsProps> => {
  if (name === SERVICE_NAME_FIELD) {
    return (props: FieldBadgeWithActionsProps) => (
      <ServiceNameBadgeWithActions {...props} share={share} core={core} />
    );
  }

  return FieldBadgeWithActions;
};

const getResourceBadgeIcon = (
  name: FieldKey,
  fields: Readonly<Record<FieldKey, FieldValue>>
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

        const value = fields[name];

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
    const value = formatFieldValue(
      resourceDoc[name],
      row.raw,
      fieldFormats,
      dataView,
      dataView.getFieldByName(name),
      'html'
    );

    return {
      name,
      rawValue: resourceDoc[name],
      // TODO: formatFieldValue doesn't actually return a string in certain circumstances, change
      // this line below once it does.
      value: typeof value === 'string' ? value : `${value}`,
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

const isFieldAllowed = (field: string) =>
  !FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT.some((prefix) => field.startsWith(prefix));
