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
import Version, { SemVer } from 'semver';
import {
  MigrationPlugin,
  SavedObjectDoc,
  SemverTransforms,
  TransformFn,
} from './types';

export interface TransformOpts {
  kibanaVersion: string;
  plugins: MigrationPlugin[];
}

interface SemverTransform {
  semver: string;
  transform: TransformFn;
}

interface TypeToTransforms {
  [type: string]: SemverTransform[];
}

export function createDocTransform({
  kibanaVersion,
  plugins,
}: TransformOpts): TransformFn {
  const typeTransforms = buildTypeTransforms(kibanaVersion, plugins);

  return function docTransform(doc): SavedObjectDoc {
    if (doc.semver === kibanaVersion) {
      return doc;
    }
    const docSemver = parseSemver(doc.semver || '0.0.0');
    const docType = doc.type;
    const transforms = typeTransforms[docType] || [];
    for (const { semver, transform } of transforms) {
      if (Version.gt(semver, docSemver)) {
        doc = transform(doc);

        // In major-version upgrades, we support breaking changes, including
        // renaming types (e.g. "dash" -> "dashboard")
        if (doc.type !== docType) {
          return docTransform(doc);
        }
      }
    }

    return { ...doc, semver: kibanaVersion };
  };
}

function buildTypeTransforms(
  kibanaVersion: string,
  plugins: MigrationPlugin[]
): TypeToTransforms {
  return plugins.reduce(
    (acc, plugin) => Object.assign(acc, migrationArrays(kibanaVersion, plugin)),
    {}
  );
}

function migrationArrays(kibanaVersion: string, plugin: MigrationPlugin) {
  return _.mapValues(plugin.migrations, (semvers: SemverTransforms) =>
    Object.entries(semvers)
      .map(([semver, transform]) =>
        buildSemverTransform(plugin.id, semver, transform)
      )
      .sort((a, b) => Version.compare(a.semver, b.semver))
      .filter(({ semver }) => Version.lte(semver, kibanaVersion))
  );
}

function buildSemverTransform(
  pluginId: string,
  semver: string,
  transform: TransformFn
): SemverTransform {
  return {
    semver,
    transform(doc) {
      try {
        return { ...transform(doc), semver };
      } catch (error) {
        error.transform = { pluginId, semver, type: doc.type };
        throw error;
      }
    },
  };
}

function parseSemver(version: string): SemVer {
  const result = Version.coerce(version);
  if (!result) {
    throw new Error(`Invalid semver "${version}".`);
  }
  return result;
}
