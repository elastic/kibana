/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstIpLocationCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { getMapStringListValuesFromAst } from '../../definitions/utils/maps';
import {
  getDefaultPropertyNames,
  getIpLocationTargetPrefix,
  getIpLocationVariant,
  getPropertyTypeFromAnyVariant,
} from './utils';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[]
): ESQLColumnData[] => {
  const ipLocationCommand = command as ESQLAstIpLocationCommand;
  const prefix = getIpLocationTargetPrefix(ipLocationCommand);

  if (!prefix) {
    return previousColumns;
  }

  const variant = getIpLocationVariant(ipLocationCommand);
  const selectedProperties = getMapStringListValuesFromAst(
    ipLocationCommand.namedParameters,
    'properties'
  );
  const propertyNames = selectedProperties ?? (variant ? getDefaultPropertyNames(variant) : []);

  const newColumns: ESQLColumnData[] = propertyNames.flatMap((property) => {
    const type = variant ? variant[property]?.type : getPropertyTypeFromAnyVariant(property);

    if (!type) {
      return [];
    }

    return [
      {
        name: `${prefix}.${property}`,
        type,
        userDefined: false,
      },
    ];
  });

  return [...previousColumns, ...newColumns];
};
