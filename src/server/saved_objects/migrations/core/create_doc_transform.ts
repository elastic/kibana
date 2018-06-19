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
import Version from 'semver';
import {
  MigrationPlugin,
  SavedObjectDoc,
  TransformFn,
  VersionTransforms,
} from './types';

export interface TransformOpts {
  kibanaVersion: string;
  plugins: MigrationPlugin[];
}

interface TypeTransforms {
  [type: string]: Array<{ version: number; transform: TransformFn }>;
}

/**
 * createDocTransform creates a function which, when passed
 * a saved object document, will upgrade it to be the same version as
 * the plugins to which the document belongs. This uses the migrations (if any)
 * that are defined by the plugins.
 *
 * @param {TransformOpts} opts
 * @prop {string} kibanaVersion - The current version of Kibana
 * @prop {MigrationPlugin[]} plugins - The plugins whose migrations will be used
 *    to update documents.
 * @returns {TransformFn} - A function (doc) => doc
 */
export function createDocTransform({ kibanaVersion, plugins }: TransformOpts) {
  const kibanaMajorVersion = Version.major(kibanaVersion);
  const typeTransforms: TypeTransforms = plugins
    .filter(p => p.migrations)
    .reduce(
      (acc, p) => Object.assign(acc, transformsByType(p, kibanaMajorVersion)),
      {}
    );

  return function transformDoc(doc: SavedObjectDoc): SavedObjectDoc {
    const transforms = typeTransforms[doc.type] || [];
    const docVersion = getDocVersion(doc, kibanaMajorVersion);
    const originalDocType = doc.type;
    for (const { version, transform } of transforms) {
      if (version >= docVersion) {
        doc = transform(doc);
      }
      // We can make breaking changes between major versions, including
      // renaming types (e.g. dash -> dashboard). This is also why we
      // are in a for loop, rather than a reduce (so we can short-circuit here).
      if (doc.type !== originalDocType) {
        return transformDoc(doc);
      }
    }
    return { ...doc, migrationVersion: kibanaMajorVersion };
  };
}

function transformsByType(plugin: MigrationPlugin, kibanaMajorVersion: number) {
  return _.mapValues(plugin.migrations, transforms =>
    transformsToArray(plugin, kibanaMajorVersion, transforms)
  );
}

function transformsToArray(
  plugin: MigrationPlugin,
  kibanaMajorVersion: number,
  transforms: VersionTransforms
) {
  return Object.entries(transforms)
    .map(([version, transform]) => ({
      transform: decorateTransformError(transform, version, plugin),
      version: toInt(version, plugin),
    }))
    .sort((a, b) => a.version - b.version)
    .filter(({ version }) => version <= kibanaMajorVersion);
}

function toInt(version: string, plugin: MigrationPlugin) {
  const result = parseInt(version, 10);
  if (isNaN(result)) {
    throw new Error(
      `Plugin "${
        plugin.id
      }" defined non-numeric migration version "${version}".`
    );
  }
  return result;
}

function getDocVersion(doc: SavedObjectDoc, kibanaMajorVersion: number) {
  return doc.migrationVersion === undefined
    ? kibanaMajorVersion
    : doc.migrationVersion;
}

function decorateTransformError(
  transform: TransformFn,
  version: string,
  plugin: MigrationPlugin
) {
  return function tryTransformDoc(doc: SavedObjectDoc) {
    try {
      return { ...transform(doc), migrationVersion: version };
    } catch (error) {
      error.transform = {
        docId: doc.id,
        pluginId: plugin.id,
        type: doc.type,
        version,
      };
      throw error;
    }
  };
}
