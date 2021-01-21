/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
