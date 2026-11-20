/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_FIELD } from '@kbn/ols';

const ROOT_FIELDS = [
  'namespace',
  'namespaces',
  'type',
  'references',
  'migrationVersion', // deprecated, see https://github.com/elastic/kibana/pull/150075
  'coreMigrationVersion',
  'typeMigrationVersion',
  'managed',
  'accessControl',
  'updated_at',
  'updated_by',
  'created_at',
  'created_by',
  'originId',
];

export function getRootFields() {
  return [...ROOT_FIELDS];
}

/**
 * Provides an array of paths for ES source filtering. The stored ACL is fetched only when the
 * caller asked for it with `includeAcl`.
 */
export function includedFields(
  type: string | string[] = '*',
  fields?: string[] | string,
  includeAcl = false
): string[] | undefined {
  if (!fields || fields.length === 0) {
    return;
  }

  const sourceFields = typeof fields === 'string' ? [fields] : fields;
  const sourceType = typeof type === 'string' ? [type] : type;

  return (
    sourceType
      .reduce((acc: string[], t) => {
        acc.push(...sourceFields.map((f) => `${t}.${f}`));
        return acc;
      }, [])
      .concat(ROOT_FIELDS)
      // `ROOT_FIELDS` lists the root fields that callers can use, for example in aggregations, so it
      // leaves out the stored ACL.
      .concat(includeAcl ? [ACL_FIELD] : [])
  );
}
