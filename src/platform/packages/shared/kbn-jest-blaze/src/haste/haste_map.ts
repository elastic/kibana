/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as HasteMap from 'jest-haste-map';
import { ChangeTracker } from '@kbn/module-graph';

// Types from jest-haste-map are in complete - add them here
interface HasteMapInstance {
  on: (
    event: string,
    listener: (evt: { eventsQueue?: Array<{ filePath: string }> }) => void
  ) => void;
  getCacheFilePath?: () => string;
  // this is actually a private method 🤡 but Jest calls it from the consumer
  // too, so we're not committing any worse crimes than Jest itself
  setupCachePath: (options: HasteMapOptions) => Promise<void>;
}

interface HasteMapClass {
  new (options: HasteMapOptions): HasteMapInstance;
  create: (options: HasteMapOptions) => Promise<HasteMapInstance>;
  getStatic: (options: HasteMapOptions) => HasteMapClass;
}

const DefaultHasteMap = HasteMap.default as unknown as HasteMapClass;

// minimal set of options
interface HasteMapOptions {
  cacheDirectory?: string;
}

/**
 * This is a custom HasteMap implementation that allows us to
 * listen to change events when Jest is running in watch mode,
 * which we need to invalidate the cache in `@kbn/module-graph`.
 */
// eslint-disable-next-line import/no-default-export
export default class CustomHasteMap extends DefaultHasteMap {
  constructor(options: HasteMapOptions) {
    super(options);

    // jest actually calls `setupCachePath` only for the default
    // HasteMap implementation. So we call it here manually. The
    // method is async, but in practice resolves in the next tick,
    // so race conditions are unlikely.
    this.ensureCachePath(options);

    // make sure we start with a clean slate
    ChangeTracker.invalidateChangedFiles(options.cacheDirectory!, []);

    // Install the change listener once per instance.
    this.on('change', (evt) => {
      const files = (evt.eventsQueue ?? []).map((e) => e.filePath);

      if (files.length === 0) return;

      ChangeTracker.invalidateChangedFiles(options.cacheDirectory!, files);
    });
  }

  async ensureCachePath(options: HasteMapOptions) {
    await this.setupCachePath(options).catch((err) => {});
  }

  static async create(options: HasteMapOptions) {
    const instance = new CustomHasteMap(options);
    await instance.setupCachePath(options);
    return instance;
  }
}
