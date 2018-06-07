/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import * as Semver from 'semver';
import { IndexMapping } from './types';

export type MigrationType = 'downgrade' | 'upgrade' | 'none';
type MaybeMigrationType = MigrationType | undefined;

export function migrationType(
  indexVersion: string,
  kibanaVersion: string,
  indexMappings: IndexMapping,
  activeMappings: IndexMapping
): MigrationType {
  return (
    migrationTypeFromVersions(indexVersion, kibanaVersion) ||
    migrationTypeFromMappings(
      indexMappings.doc.properties,
      activeMappings.doc.properties
    ) ||
    'none'
  );
}

function migrationTypeFromVersions(
  semver1: string,
  semver2: string
): MigrationType | undefined {
  if (semver1 === '' || Semver.lt(semver1, semver2)) {
    return 'upgrade';
  }
  if (Semver.gt(semver1, semver2)) {
    return 'downgrade';
  }
}

// Recursively compares the properties of the index's mappings
// with those which are active in the system / defined by active plugins.
function migrationTypeFromMappings(
  indexProp: any,
  activeProp: any,
  prefix: string[] = []
): MaybeMigrationType {
  const allKeys = _.keys(indexProp).concat(_.keys(activeProp));
  return _.uniq(allKeys).reduce(validateKey, undefined);

  function validateKey(result: MaybeMigrationType, key: string) {
    const propertyPath = [...prefix, key];
    const indexValue = indexProp[key];
    const kibanaValue = activeProp[key];

    // If a prop is in the index, but not in any plugins, either:
    if (!activeProp.hasOwnProperty(key)) {
      // A. It's a root-level property, which most likely indicates a disabled plugin
      if (propertyPath.length === 1) {
        return;
      }
      // B. It's a nested property, which indicates a breaking change to the mappings
      throw new Error(
        `Invalid mapping change: deleted property "${propertyPath.join('.')}"`
      );
    }

    // If a prop is in the plugins, but not in the index, this is additive and requires upgrade
    if (!indexProp.hasOwnProperty(key)) {
      return 'upgrade';
    }

    // If the prop is in both and is an object, we need to do a deeper comparison
    if (_.isObject(indexValue) && _.isObject(kibanaValue)) {
      return (
        migrationTypeFromMappings(indexValue, kibanaValue, propertyPath) ||
        result
      );
    }

    // If a prop is in both, but its type has changed, this is a breaking change (type change)
    if (indexValue !== kibanaValue) {
      throw new Error(
        `Invalid mapping change: property "${propertyPath.join(
          '.'
        )}" changed from "${indexValue}" to "${kibanaValue}"`
      );
    }

    return result;
  }
}
