/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PackageInfo } from '@kbn/config';
import { isArray, isInteger, mapKeys } from 'lodash';
import { FullStoryApi } from './fullstory';

export interface CustomEventConfig {
  enabled: boolean;
  fullstoryOrgId?: string;
  esOrgId?: string;
  basePath: any;
  userIdPromise: Promise<string | undefined>;
  packageInfo: PackageInfo;
}

// based on https://help.fullstory.com/hc/en-us/articles/360020623234#Custom%20Event%20Name%20Requirements
type FULLSTORY_EVENT_TYPES = string | number | boolean | Date;
type FullstoryEventValue = FULLSTORY_EVENT_TYPES | FULLSTORY_EVENT_TYPES[] | undefined;

export class CustomEvents {
  private fullStory?: FullStoryApi;
  private customEventContext: Record<string, FullstoryEventValue> = {};

  public async initialize(config: CustomEventConfig): Promise<boolean> {
    // Very defensive try/catch to avoid any UnhandledPromiseRejections
    try {
      const { enabled, fullstoryOrgId, esOrgId, basePath, userIdPromise, packageInfo } = config;
      if (!enabled || !fullstoryOrgId) {
        return false; // do not load any fullstory code in the browser if not enabled
      }

      // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
      const fullStoryChunkPromise = import('./fullstory');

      // We need to call FS.identify synchronously after FullStory is initialized, so we must load the user upfront
      const [{ initializeFullStory }, userId] = await Promise.all([
        fullStoryChunkPromise,
        userIdPromise,
      ]);

      const { fullStory, sha256 } = initializeFullStory({
        basePath,
        orgId: fullstoryOrgId,
        packageInfo,
      });

      // This needs to be called syncronously to be sure that we populate the user ID soon enough to make sessions merging
      // across domains work
      if (userId) {
        // Join the cloud org id and the user to create a truly unique user id.
        // The hashing here is to keep it at clear as possible in our source code that we do not send literal user IDs
        const hashedId = sha256(esOrgId ? `${esOrgId}:${userId}` : `${userId}`);
        const kibanaVer = packageInfo.version;
        // TODO: use semver instead
        const parsedVer = (kibanaVer.indexOf('.') > -1 ? kibanaVer.split('.') : []).map((s) =>
          parseInt(s, 10)
        );
        fullStory.identify(
          hashedId,
          this.formatContext({
            esOrgId,
            version: kibanaVer,
            versionMajor: parsedVer[0] ?? -1,
            versionMinor: parsedVer[1] ?? -1,
            versionPatch: parsedVer[2] ?? -1,
          })
        );
        this.fullStory = fullStory;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[custom events] Could not call initialize due to error: ${e?.toString() || e}`
      );
    }

    return !!this.fullStory;
  }

  private getFullstoryType(value: FullstoryEventValue) {
    // For arrays, make the decidion based on the first element
    const v = isArray(value) ? value[0] : value;
    switch (typeof v) {
      case 'string':
        return 'str';
      case 'number':
        return isInteger(value) ? 'int' : 'real';
      case 'boolean':
        return 'bool';
      case 'object':
        if (v instanceof Date) {
          return 'date';
        }
    }
  }

  private getCurrentMemoryState() {
    // Get performance information from the browser (non standard property
    // @ts-expect-error 2339
    const memory = window.performance.memory;
    let memInfo = {};
    if (memory) {
      memInfo = {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        jsHeapSizeTotal: memory.totalJSHeapSize,
        jsHeapSizeUsed: memory.usedJSHeapSize,
      };
    }
    return memInfo;
  }

  private formatContext(context: Record<string, FullstoryEventValue>) {
    // format context keys as required for env vars, see docs: https://help.fullstory.com/hc/en-us/articles/360020623234
    return mapKeys(context, (value, key) => {
      const type = this.getFullstoryType(value);
      return [key, type].join('_');
    });
  }

  public setUserContext(context: Record<string, FullstoryEventValue>) {
    if (!this.fullStory) return;

    try {
      this.fullStory.setUserVars(this.formatContext(context));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[custom events] Could not report custom event due to error: ${e.toString()}`,
        e
      );
    }
  }

  public setCustomEventContext(context: Record<string, FullstoryEventValue>) {
    if (!this.fullStory) return;

    Object.keys(context).forEach((key) => {
      if (context[key] === undefined) {
        this.clearCustomEventContext(key);
      } else {
        this.customEventContext[key] = context[key];
      }
    });
  }

  private clearCustomEventContext(fieldName: string | string[]) {
    if (!this.fullStory) return;
    const fields = typeof fieldName === 'string' ? [fieldName] : fieldName;
    fields.forEach((field) => {
      if (this.customEventContext.hasOwnProperty(field)) {
        delete this.customEventContext[field];
      }
    });
  }

  reportCustomEvent = (eventName: string, params: Record<string, FullstoryEventValue> = {}) => {
    if (!this.fullStory || !eventName) return;
    try {
      const context = this.formatContext({
        ...this.getCurrentMemoryState(),
        ...this.customEventContext,
        ...params,
      });
      this.fullStory.event(eventName, context);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[custom events] Could not report custom event due to error: ${e?.toString() || e}`,
        e
      );
    }
  };
}
