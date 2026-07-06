/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isBooleanLiteral, isStringLiteral, LeafPrinter } from '@elastic/esql';
import type { ESQLAstUserAgentCommand, ESQLCommand } from '@elastic/esql/types';
import type { SupportedDataType } from '../../definitions/types';
import type { ESQLColumnData } from '../types';
import { getPropertiesList } from './utils';

type PropertyGroup = 'name' | 'version' | 'os' | 'device';

const DEFAULT_PROPERTIES: PropertyGroup[] = ['name', 'version', 'os', 'device'];

const PROPERTY_COLUMNS: Record<
  PropertyGroup,
  Array<{ suffix: string; type: SupportedDataType }>
> = {
  name: [{ suffix: 'name', type: 'keyword' }],
  version: [{ suffix: 'version', type: 'keyword' }],
  os: [
    { suffix: 'os.name', type: 'keyword' },
    { suffix: 'os.version', type: 'keyword' },
    { suffix: 'os.full', type: 'keyword' },
  ],
  device: [{ suffix: 'device.name', type: 'keyword' }],
};

const DEVICE_TYPE_COLUMN = { suffix: 'device.type', type: 'keyword' as SupportedDataType };

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const userAgentCommand = command as ESQLAstUserAgentCommand;
  const { targetField, namedParameters } = userAgentCommand;

  if (!targetField) return previousColumns;

  const prefix = LeafPrinter.column(targetField);

  // Determine which property groups are active
  const propertiesList = getPropertiesList(userAgentCommand);
  let activeProperties: PropertyGroup[];
  if (propertiesList) {
    activeProperties = propertiesList.values
      .filter(isStringLiteral)
      .map((v) => v.valueUnquoted as PropertyGroup)
      .filter((v): v is PropertyGroup => DEFAULT_PROPERTIES.includes(v));
  } else {
    activeProperties = DEFAULT_PROPERTIES;
  }

  // Determine if device.type should be included
  let extractDeviceType = false;
  if (namedParameters && !Array.isArray(namedParameters) && 'entries' in namedParameters) {
    const entry = namedParameters.entries.find(
      (e) => isStringLiteral(e.key) && e.key.valueUnquoted === 'extract_device_type'
    );
    if (entry && isBooleanLiteral(entry.value) && entry.value.value === 'true') {
      extractDeviceType = true;
    }
  }

  const newColumns: ESQLColumnData[] = activeProperties
    .flatMap((group) => PROPERTY_COLUMNS[group])
    .map(({ suffix, type }) => ({ name: `${prefix}.${suffix}`, type, userDefined: false }));

  // device.type is always added when extract_device_type: true, regardless of properties list
  if (extractDeviceType) {
    newColumns.push({
      name: `${prefix}.${DEVICE_TYPE_COLUMN.suffix}`,
      type: DEVICE_TYPE_COLUMN.type,
      userDefined: false,
    });
  }

  return [...previousColumns, ...newColumns];
};
