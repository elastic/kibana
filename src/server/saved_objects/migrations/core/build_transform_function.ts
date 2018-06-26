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
import Semver from 'semver';
import {
  MigrationPlugin,
  SavedObjectDoc,
  TransformFn,
  VersionTransforms,
} from './types';

interface TransformsByType {
  [type: string]: Array<{
    version: string;
    transform: TransformFn;
  }>;
}

/**
 * Builds a function which, when passed a saved object client document, will upgrade the doc
 * to the current version as specified by the doc's plugin.
 *
 * @param plugins - The list of migration plugins whose migrations will be used to transform docs
 */
export function buildTransformFunction(
  plugins: MigrationPlugin[]
): TransformFn {
  // Here, we convert our plugins to a dictionary keyed by document type.
  // The dictionary's values are transforms (`{ version, transform }`) which
  // are sorted by semver, so we can be sure to apply transforms in the proper order.
  const transformsByType = buildTransforms(plugins);

  return function transformDoc(doc: SavedObjectDoc): SavedObjectDoc {
    const { type, migrationVersion = '0.0.0' } = doc;

    const transforms = transformsByType[type];

    if (!transforms) {
      return doc;
    }

    // We use a for loop here because we need to exit early in the case
    // of a transform that changes the document's type.
    for (const { version, transform } of transforms) {
      if (Semver.gt(version, migrationVersion)) {
        doc = transform(doc);
      }

      // If the doc's type has changed, we recur so that the doc
      // can be passed through the appropriate transforms for its
      // new type (if there are any).
      if (doc.type !== type) {
        return transformDoc(doc);
      }
    }

    return doc;
  };
}

function buildTransforms(plugins: MigrationPlugin[]): TransformsByType {
  return _.merge(
    {},
    ...plugins
      .filter(p => p.migrations)
      .map(p => _.mapValues(p.migrations, m => orderedTransforms(p, m)))
  );
}

function orderedTransforms(
  plugin: MigrationPlugin,
  migrations: VersionTransforms
) {
  return Object.entries(migrations)
    .map(([version, transform]) => ({
      transform: wrapWithTry(plugin, version, transform),
      version,
    }))
    .sort((a, b) => Semver.compare(a.version, b.version));
}

function wrapWithTry(
  plugin: MigrationPlugin,
  version: string,
  transform: TransformFn
) {
  return function tryTransformDoc(doc: SavedObjectDoc) {
    try {
      return {
        ...transform(doc),
        migrationVersion: version,
      };
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
