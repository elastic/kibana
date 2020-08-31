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

import Fs from 'fs';
import Path from 'path';

import { ChecksumMap } from './project_checksums';
import { Project } from '../utils/project';
import { Kibana } from '../utils/kibana';

export class BootstrapCacheFile {
  private readonly path: string;
  private readonly expectedValue: string | undefined;

  constructor(kbn: Kibana, project: Project, checksums: ChecksumMap | false) {
    this.path = Path.resolve(project.targetLocation, '.bootstrap-cache');

    if (!checksums) {
      return;
    }

    const projectAndDepCacheKeys = Array.from(kbn.getProjectAndDeps(project.name).values())
      // sort deps by name so that the key is stable
      .sort((a, b) => a.name.localeCompare(b.name))
      // get the cacheKey for each project, return undefined if the cache key couldn't be determined
      .map((p) => {
        const cacheKey = checksums.get(p.name);
        if (cacheKey) {
          return `${p.name}:${cacheKey}`;
        }
      });

    // if any of the relevant cache keys are undefined then the projectCacheKey must be too
    this.expectedValue = projectAndDepCacheKeys.some((k) => !k)
      ? undefined
      : [
          `# this is only human readable for debugging, please don't try to parse this`,
          ...projectAndDepCacheKeys,
        ].join('\n');
  }

  isValid() {
    if (!this.expectedValue) {
      return false;
    }

    try {
      return Fs.readFileSync(this.path, 'utf8') === this.expectedValue;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  }

  delete() {
    try {
      Fs.unlinkSync(this.path);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  write() {
    if (!this.expectedValue) {
      return;
    }

    Fs.mkdirSync(Path.dirname(this.path), { recursive: true });
    Fs.writeFileSync(this.path, this.expectedValue);
  }
}
