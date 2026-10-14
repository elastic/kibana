/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBooleanLiteral, isStringLiteral } from '@elastic/esql';
import type { ESQLAstUserAgentCommand, ESQLCommand } from '@elastic/esql/types';
import { Commands } from '../../definitions/keywords';
import type { ElasticsearchCommandOutputVariant } from '../../definitions/types';
import {
  buildPrefixedColumns,
  getColumnName,
  getCommandOutputColumns,
} from '../../definitions/utils/columns';
import { getMapStringListValuesFromAst } from '../../definitions/utils/maps';
import type { ESQLColumnData } from '../types';

const DEVICE_TYPE_PROPERTY = 'device.type';

const getPropertyGroup = (column: string): string => column.split('.')[0];

const isExtractDeviceTypeEnabled = (command: ESQLAstUserAgentCommand): boolean => {
  const { namedParameters } = command;

  if (!namedParameters || Array.isArray(namedParameters) || !('entries' in namedParameters)) {
    return false;
  }

  const entry = namedParameters.entries.find(
    ({ key }) => isStringLiteral(key) && key.valueUnquoted === 'extract_device_type'
  );

  return !!entry && isBooleanLiteral(entry.value) && entry.value.value === 'true';
};

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const userAgentCommand = command as ESQLAstUserAgentCommand;
  const { targetField } = userAgentCommand;
  const output = getCommandOutputColumns(Commands.USER_AGENT);

  if (!targetField || !output) return previousColumns;

  const selectedProperties = getMapStringListValuesFromAst(
    userAgentCommand.namedParameters,
    'properties'
  );

  // `device.type` is excluded from the `properties` expansion and appended last only when enabled.
  const selectedColumns: ElasticsearchCommandOutputVariant = Object.fromEntries(
    Object.entries(output).filter(
      ([column]) =>
        column !== DEVICE_TYPE_PROPERTY &&
        (!selectedProperties || selectedProperties.includes(getPropertyGroup(column)))
    )
  );

  const deviceType = output[DEVICE_TYPE_PROPERTY];
  if (deviceType && isExtractDeviceTypeEnabled(userAgentCommand)) {
    selectedColumns[DEVICE_TYPE_PROPERTY] = deviceType;
  }

  return [...previousColumns, ...buildPrefixedColumns(getColumnName(targetField), selectedColumns)];
};
