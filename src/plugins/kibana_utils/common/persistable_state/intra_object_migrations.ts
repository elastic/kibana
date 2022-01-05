/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { cloneDeep, get, PropertyPath, set } from 'lodash';
import { MigrateFunction, MigrateFunctionsObject } from '.';

/**
 * Returns a MigrateFunctionsObject with migrate functions that are set up to
 * apply the original migrations _within_ a larger object.
 *
 * Example use with getApplyMigrationWithinObject:
 *
 * export const getLensFilterMigrations = (filterMigrations: MigrateFunctionsObject) =>
 *  getIntraObjectMigrationMap(filterMigrations, (migrate) =>
 *      getApplyMigrationWithinObject(migrate, 'attributes.state.filters')
 *  );
 */
export const getIntraObjectMigrationMap = (
  objectMigrationMap: MigrateFunctionsObject,
  getApplyIntraObjectMigration: (migration: MigrateFunction) => MigrateFunction
) => {
  const intraObjectMigrationMap: MigrateFunctionsObject = {};
  for (const version in objectMigrationMap) {
    if (objectMigrationMap.hasOwnProperty(version)) {
      intraObjectMigrationMap[version] = getApplyIntraObjectMigration(objectMigrationMap[version]);
    }
  }
  return intraObjectMigrationMap;
};

/**
 * Given a migration and a path, this generates a function that applies the migration in
 * an object at the specified path.
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

    const migrated = Array.isArray(toMigrate)
      ? toMigrate.map((element) => migrateWithSerialization(element))
      : migrateWithSerialization(toMigrate);

    set(cloned, path, migrated);

    return cloned;
  };
};
