/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';

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

    lifecycle.beforeEachRunnable.add((runnable) => {
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
    this.add((current) => ({
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
      .map((c) => encodeURIComponent(c))
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

    this.add((current) => ({
      screenshots: [...(Array.isArray(current.screenshots) ? current.screenshots : []), screenshot],
    }));

    return screenshot;
  }

  get(runnable: any) {
    return this.allMetadata.get(runnable);
  }
}
