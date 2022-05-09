/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsClient, SavedObjectsBulkCreateObject } from '.';

/** Handler to execute before fetching one or multiple saved object(s) */
type PreGetHook = (...args: Parameters<SavedObjectsClient['bulkGet']>) => Promise<void>;
/** Handler to execute after fetching one or multiple saved object(s) */
type PostGetHook = (objects: SavedObject[]) => Promise<void>;

/** Handler to execute before creating one or multiple saved object(s) */
type PreCreateHook = (
  ...args: Parameters<SavedObjectsClient['bulkCreate']>
) => Promise<SavedObjectsBulkCreateObject[] | undefined>;
/** Handler to execute after creating one or multiple saved object(s) */
type PostCreateHook = (
  objects: Array<Awaited<ReturnType<SavedObjectsClient['create']>>>
) => Promise<void>;

/** Map of hooks to execute **before** CRUD methods of the SavedObjectsClient */
export interface PreHooks {
  get: PreGetHook[];
  create: PreCreateHook[];
}

/** Map of hooks to execute **after** CRUD methods of the SavedObjectsClient */
export interface PostHooks {
  get: PostGetHook[];
  create: PostCreateHook[];
}

export type ISavedObjectsHooks = Omit<SavedObjectsHooksRegistry, 'pre' | 'post'>;

/**
 * Registry holding information about all the registered {@link PreHooks | "Pre" hooks} and .{@link PostHooks | "Post" hooks}
 *
 * @public
 */
export class SavedObjectsHooksRegistry {
  private _preHooks: PreHooks = {
    get: [],
    create: [],
  };
  private _postHooks: PostHooks = {
    get: [],
    create: [],
  };

  public pre<K extends keyof PreHooks, H extends PreHooks[K][number]>(method: K, handler: H) {
    const hooksArray: PreHooks[K] = this._preHooks[method];
    if (hooksArray) {
      // @ts-expect-error "H" is correctly typed but for some reason it fails when used on this line
      hooksArray.push(handler);
    }
  }

  public post<K extends keyof PostHooks, H extends PostHooks[K][number]>(method: K, handler: H) {
    const hooksArray: PostHooks[K] = this._postHooks[method];
    if (hooksArray) {
      hooksArray.push(handler);
    }
  }

  public get preHooks() {
    return {
      ...this._preHooks,
    };
  }
  public get postHooks() {
    return {
      ...this._postHooks,
    };
  }
}
