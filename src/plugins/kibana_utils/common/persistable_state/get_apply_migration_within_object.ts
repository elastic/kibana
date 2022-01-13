/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { cloneDeep, get, PropertyPath, set } from 'lodash';
import { MigrateFunction } from '.';

/**
 * Given a migration and a path, this generates a function that applies the migration in
 * an object at the specified path.
 *
 * Example usage:
 *
 * const filterMigrationsObject = getFilterMigrations();
 *
 * const filtersWithinLensMigrationObject = mapValues(filterMigrations, (migrate) =>
 *   getApplyMigrationWithinObject(migrate, 'attributes.state.filters')
 *
 * @param migrate
 * @param path - object property path where the migration should be applied
 * @param options - extra configuration options
 * @returns
 */
export const getApplyMigrationWithinObject = <
  ObjectType extends SerializableRecord = SerializableRecord,
  ToMigrateType extends SerializableRecord = SerializableRecord
>(
  migrate: MigrateFunction<ToMigrateType>,
  path: PropertyPath,
  {
    serialize = (obj) => obj,
    deserialize = (obj) => obj,
  }: { serialize: (obj: any) => any; deserialize: (serialized: any) => any } = {
    serialize: (obj) => obj,
    deserialize: (obj) => obj,
  }
): MigrateFunction<ObjectType> => {
  return (obj: ObjectType) => {
    const cloned = cloneDeep(obj);
    const toMigrate = get(cloned, path);

    if (!toMigrate) return cloned;

    const migrateWithSerialization = (sub: any) => serialize(migrate(deserialize(sub)));

    const migrated = migrateWithSerialization(toMigrate);

    set(cloned, path, migrated);

    return cloned;
  };
};
