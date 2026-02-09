/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasDiff, OperationChange } from './diff_oas';
import type { SchemaChange } from './schema_diff';

export interface BreakingChange {
  type: 'path_removed' | 'method_removed' | 'operation_breaking';
  path: string;
  method?: string;
  reason: string;
  details?: unknown;
  schemaChanges?: SchemaChange[];
}

const isBreakingOperationChange = (change: OperationChange): boolean => {
  switch (change.change) {
    case 'added':
      return false;
    case 'removed':
      return true;
    case 'modified':
      if (change.schemaDiff) {
        return change.schemaDiff.hasBreakingChanges;
      }
      return true;
    default:
      return false;
  }
};

const getBreakingReason = (change: OperationChange): string => {
  if (change.change === 'removed') {
    return `${change.type} removed`;
  }

  if (change.schemaDiff?.hasBreakingChanges) {
    const breakingChanges = change.schemaDiff.changes.filter((c) => {
      switch (c.type) {
        case 'property_added_optional':
          return false;
        default:
          return true;
      }
    });

    if (breakingChanges.length > 0) {
      const reasons = breakingChanges.map((c) => {
        switch (c.type) {
          case 'property_added_required':
            return `required property '${c.details?.property}' added`;
          case 'property_removed':
            return `property '${c.details?.property}' removed`;
          case 'property_type_changed':
            return `type changed from '${c.details?.oldType}' to '${c.details?.newType}'`;
          case 'required_changed':
            return `property '${c.details?.property}' became required`;
          case 'schema_structure_changed':
            return 'schema structure changed';
          default:
            return c.type;
        }
      });
      return `${change.type}: ${reasons.join(', ')}`;
    }
  }

  return `${change.type} ${change.change}`;
};

export const filterBreakingChanges = (diff: OasDiff): BreakingChange[] => {
  const pathsRemoved = diff.pathsRemoved.map((pathRemoved) => ({
    type: 'path_removed' as const,
    path: pathRemoved.path,
    reason: 'Endpoint removed',
  }));

  const methodsRemoved = diff.methodsRemoved.map((methodRemoved) => ({
    type: 'method_removed' as const,
    path: methodRemoved.path,
    method: methodRemoved.method,
    reason: 'HTTP method removed',
  }));

  const operationBreaking = diff.operationsModified.flatMap((opModified) =>
    opModified.changes.filter(isBreakingOperationChange).map((change) => ({
      type: 'operation_breaking' as const,
      path: opModified.path,
      method: opModified.method,
      reason: getBreakingReason(change),
      details: change.details,
      schemaChanges: change.schemaDiff?.changes.filter((c) => c.type !== 'property_added_optional'),
    }))
  );

  return [...pathsRemoved, ...methodsRemoved, ...operationBreaking];
};
