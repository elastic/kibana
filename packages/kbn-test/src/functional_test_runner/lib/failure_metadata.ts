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

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

import { Lifecycle } from './lifecycle';

interface Metadata {
  [key: string]: unknown;
}

export class FailureMetadata {
  // mocha's global types mean we can't import Mocha or it will override the global jest types..............
  private currentRunnable?: any;
  private readonly allMetadata = new Map<any, Metadata>();

  constructor(lifecycle: Lifecycle) {
    if (!process.env.GCS_UPLOAD_PREFIX && process.env.CI) {
      throw new Error(
        'GCS_UPLOAD_PREFIX environment variable is not set and must always be set on CI'
      );
    }

    lifecycle.beforeEachRunnable.add(runnable => {
      this.currentRunnable = runnable;
    });
  }

  add(metadata: Metadata | ((current: Metadata) => Metadata)) {
    if (!this.currentRunnable) {
      throw new Error('no current runnable to associate metadata with');
    }

    const current = this.allMetadata.get(this.currentRunnable);
    this.allMetadata.set(this.currentRunnable, {
      ...current,
      ...(typeof metadata === 'function' ? metadata(current || {}) : metadata),
    });
  }

  addMessages(messages: string[]) {
    this.add(current => ({
      messages: [...(Array.isArray(current.messages) ? current.messages : []), ...messages],
    }));
  }

  /**
   * @param name Name to label the URL with
   * @param repoPath absolute path, within the repo, that will be uploaded
   */
  addScreenshot(name: string, repoPath: string) {
    const prefix = process.env.GCS_UPLOAD_PREFIX;

    if (!prefix) {
      return;
    }

    const slash = prefix.endsWith('/') ? '' : '/';
    const urlPath = Path.relative(REPO_ROOT, repoPath)
      .split(Path.sep)
      .map(c => encodeURIComponent(c))
      .join('/');

    if (urlPath.startsWith('..')) {
      throw new Error(
        `Only call addUploadLink() with paths that are within the repo root, received ${repoPath} and repo root is ${REPO_ROOT}`
      );
    }

    const url = `https://storage.googleapis.com/${prefix}${slash}${urlPath}`;
    const screenshot = {
      name,
      url,
    };

    this.add(current => ({
      screenshots: [...(Array.isArray(current.screenshots) ? current.screenshots : []), screenshot],
    }));

    return screenshot;
  }

  get(runnable: any) {
    return this.allMetadata.get(runnable);
  }
}
