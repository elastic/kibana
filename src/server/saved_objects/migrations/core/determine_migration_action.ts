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
import { IndexMapping } from './call_cluster';

export enum MigrationAction {
  None = 0,
  Patch = 1,
  Migrate = 2,
}

/**
 * Provides logic that diffs the actual index mappings with the expected
 * mappings. It ignores differences in dynamic mappings.
 *
 * If mappings differ in a patchable way, the result is 'patch', if mappings
 * differ in a way that requires migration, the result is 'migrate', and if
 * the mappings are equivalent, the result is 'none'.
 */
export function determineMigrationAction(
  actual: IndexMapping,
  expected: IndexMapping
): MigrationAction {
  if (actual.doc.dynamic !== expected.doc.dynamic) {
    return MigrationAction.Migrate;
  }

  const actualProps = actual.doc.properties;
  const expectedProps = expected.doc.properties;

  // There's a special case for root-level properties: if a root property is in actual,
  // but not in expected, it is treated like a disabled plugin and requires no action.
  return Object.keys(expectedProps).reduce((acc: number, key: string) => {
    return Math.max(acc, diffSubProperty(actualProps[key], expectedProps[key]));
  }, MigrationAction.None);
}

function diffSubProperty(actual: any, expected: any): MigrationAction {
  // We've added a sub-property
  if (actual === undefined && expected !== undefined) {
    return MigrationAction.Patch;
  }

  // We've removed a sub property
  if (actual !== undefined && expected === undefined) {
    return MigrationAction.Migrate;
  }

  // If a property has changed to/from dynamic, we need to migrate,
  // otherwise, we ignore dynamic properties, as they can differ
  if (isDynamic(actual) || isDynamic(expected)) {
    return isDynamic(actual) !== isDynamic(expected)
      ? MigrationAction.Migrate
      : MigrationAction.None;
  }

  // We have a leaf property, so we do a comparison. A change (e.g. 'text' -> 'keyword')
  // should result in a migration.
  if (typeof actual !== 'object') {
    return _.isEqual(actual, expected) ? MigrationAction.None : MigrationAction.Migrate;
  }

  // Recursively compare the sub properties
  const keys = _.uniq(Object.keys(actual).concat(Object.keys(expected)));
  return keys.reduce((acc: number, key: string) => {
    return acc === MigrationAction.Migrate
      ? acc
      : Math.max(acc, diffSubProperty(actual[key], expected[key]));
  }, MigrationAction.None);
}

function isDynamic(prop: any) {
  return prop.dynamic === true || prop.dynamic === 'true';
}
