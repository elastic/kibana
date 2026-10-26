/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { Observable, ReplaySubject } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectsRepository,
  SavedObjectBulkResult,
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsResolveOptions,
} from '@kbn/core-saved-objects-api-server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-api-server';
import type { NamespacedCache } from './namespaced_cache';
import type { UserProvided } from './clients/user_provided';
import { computeUpgradedConfigAttributes } from './create_or_upgrade_saved_config';

// Brackets are not allowed in space ids, so no space can share this key.
export const GLOBAL_NAMESPACE = '[global]';

/** One stored settings doc. `namespace` is also its `NamespacedCache` key. */
export type ConfigDocRef =
  | { readonly type: 'config'; readonly namespace: string }
  | { readonly type: 'config-global'; readonly namespace: typeof GLOBAL_NAMESPACE };

export const toConfigDocRef = (type: ConfigDocRef['type'], namespace: string): ConfigDocRef => {
  switch (type) {
    case 'config':
      return { type, namespace };
    case 'config-global':
      return { type, namespace: GLOBAL_NAMESPACE };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown config type ${exhaustive}`);
    }
  }
};

type DocState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'present'; readonly userProvided: UserProvided }
  | { readonly kind: 'missing'; readonly userProvided: UserProvided };

type Observation =
  | { readonly kind: 'found'; readonly attributes: Record<string, unknown> }
  | { readonly kind: 'missing'; readonly attributes: Record<string, unknown> }
  | { readonly kind: 'stillMissing' }
  | { readonly kind: 'failed'; readonly error: Error };

interface Transition {
  readonly state: DocState;
  readonly emit?: UserProvided;
}

interface WatchedDoc {
  readonly ref: ConfigDocRef;
  readonly snapshots$: ReplaySubject<UserProvided>;
  refCount: number;
  state: DocState;
}

export interface UiSettingsWatcherOptions {
  /** Must read with Kibana's internal identity: subscriptions outlive the request that created a client. */
  repository: ISavedObjectsRepository;
  id: string;
  buildNum: number;
  cache: Pick<NamespacedCache, 'del'>;
  pollInterval: number;
  parse: (ref: ConfigDocRef, attributes: Record<string, unknown>) => UserProvided;
  log: Logger;
}

const settle = (previous: DocState, next: Exclude<DocState, { kind: 'pending' }>): Transition =>
  previous.kind !== 'pending' && isEqual(previous.userProvided, next.userProvided)
    ? { state: next }
    : { state: next, emit: next.userProvided };

const transition = (
  state: DocState,
  observation: Observation,
  parse: (attributes: Record<string, unknown>) => UserProvided
): Transition => {
  switch (observation.kind) {
    case 'found':
      return settle(state, { kind: 'present', userProvided: parse(observation.attributes) });
    case 'missing':
      return settle(state, { kind: 'missing', userProvided: parse(observation.attributes) });
    case 'stillMissing':
    case 'failed':
      return { state };
    default: {
      const exhaustive: never = observation;
      throw new Error(`Unknown observation ${JSON.stringify(exhaustive)}`);
    }
  }
};

const toBulkGetObject = (ref: ConfigDocRef, id: string): SavedObjectsBulkGetObject => {
  switch (ref.type) {
    case 'config':
      return { type: ref.type, id, namespaces: [ref.namespace] };
    case 'config-global':
      return { type: ref.type, id };
    default: {
      const exhaustive: never = ref;
      throw new Error(`Unknown config doc ${JSON.stringify(exhaustive)}`);
    }
  }
};

/** Polls the config docs that have subscribers. It never writes to Elasticsearch or the cache, it only invalidates. */
export class UiSettingsWatcher {
  private readonly docs = new Map<string, WatchedDoc>();
  private timer?: NodeJS.Timeout;
  private inflight?: Promise<void>;
  private dirty = false;
  private failing = false;
  private stopped = false;

  constructor(private readonly options: UiSettingsWatcherOptions) {}

  watch(ref: ConfigDocRef): Observable<UserProvided> {
    return new Observable<UserProvided>((subscriber) => {
      if (this.stopped) {
        subscriber.complete();
        return;
      }
      const doc = this.acquire(ref);
      const subscription = doc.snapshots$.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        this.release(doc);
      };
    });
  }

  notifyLocalWrite(ref: ConfigDocRef): Promise<void> {
    return this.docs.has(ref.namespace) ? this.requestTick() : Promise.resolve();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    const docs = [...this.docs.values()];
    this.docs.clear();
    docs.forEach(({ snapshots$ }) => snapshots$.complete());
  }

  private acquire(ref: ConfigDocRef): WatchedDoc {
    const existing = this.docs.get(ref.namespace);
    if (existing) {
      existing.refCount += 1;
      return existing;
    }
    const doc: WatchedDoc = {
      ref,
      snapshots$: new ReplaySubject<UserProvided>(1),
      refCount: 1,
      state: { kind: 'pending' },
    };
    this.docs.set(ref.namespace, doc);
    this.requestTick();
    return doc;
  }

  private release(doc: WatchedDoc): void {
    doc.refCount -= 1;
    if (doc.refCount > 0 || this.docs.get(doc.ref.namespace) !== doc) {
      return;
    }
    this.docs.delete(doc.ref.namespace);
    if (this.docs.size === 0) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  // A request during a tick runs one more tick right after, so its read cannot predate the request.
  // The returned promise resolves once a tick that started after the request has finished.
  private requestTick = (): Promise<void> => {
    if (this.stopped || this.docs.size === 0) {
      return Promise.resolve();
    }
    if (this.inflight) {
      this.dirty = true;
      return this.inflight;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    this.inflight = this.run();
    return this.inflight;
  };

  private async run(): Promise<void> {
    do {
      this.dirty = false;
      try {
        await this.tick();
      } catch (error) {
        if (!this.stopped) {
          this.reportHealth(error);
        }
      }
    } while (this.dirty && !this.stopped);
    this.inflight = undefined;
    if (!this.stopped && this.docs.size > 0) {
      this.timer = setTimeout(this.requestTick, this.options.pollInterval);
    }
  }

  private async tick(): Promise<void> {
    const docs = [...this.docs.values()];
    if (docs.length === 0) {
      return;
    }
    const { repository, id, cache, parse } = this.options;

    const { saved_objects: savedObjects } = await repository.bulkGet<Record<string, unknown>>(
      docs.map(({ ref }) => toBulkGetObject(ref, id))
    );
    const observations = await Promise.all(
      docs.map((doc, index) => this.observe(doc, savedObjects[index]))
    );
    if (this.stopped) {
      return;
    }

    let failure: Error | undefined;
    docs.forEach((doc, index) => {
      const observation = observations[index];
      if (observation.kind === 'failed') {
        failure ??= observation.error;
      }
      if (this.docs.get(doc.ref.namespace) !== doc) {
        return;
      }
      const { state, emit } = transition(doc.state, observation, (attributes) =>
        parse(doc.ref, attributes)
      );
      if (emit) {
        cache.del(doc.ref.namespace);
        doc.snapshots$.next(emit);
      }
      doc.state = state;
    });
    this.reportHealth(failure);
  }

  private async observe(
    doc: WatchedDoc,
    result: SavedObjectBulkResult<Record<string, unknown>>
  ): Promise<Observation> {
    if (!isSavedObjectErrorResult(result)) {
      return { kind: 'found', attributes: result.attributes };
    }
    const { error } = result;
    if (error.statusCode !== 404) {
      return { kind: 'failed', error: new Error(error.message) };
    }
    // After a version bump the new doc 404s until a pull read creates it. Emit what that upgrade would
    // produce, not defaults, so values don't flip.
    if (doc.state.kind === 'missing') {
      return { kind: 'stillMissing' };
    }
    try {
      const { attributes } = await computeUpgradedConfigAttributes({
        savedObjectsClient: this.namespacedClient(doc.ref),
        version: this.options.id,
        buildNum: this.options.buildNum,
        type: doc.ref.type,
      });
      return { kind: 'missing', attributes };
    } catch (upgradeError) {
      return { kind: 'failed', error: upgradeError };
    }
  }

  // The internal repository has no spaces extension, so every read must name its namespace explicitly.
  private namespacedClient(
    ref: ConfigDocRef
  ): Pick<SavedObjectsClientContract, 'find' | 'resolve'> {
    const { repository } = this.options;
    switch (ref.type) {
      case 'config': {
        const { namespace } = ref;
        return {
          find: <T, A>(findOptions: SavedObjectsFindOptions) =>
            repository.find<T, A>({ ...findOptions, namespaces: [namespace] }),
          resolve: <T>(type: string, id: string, resolveOptions?: SavedObjectsResolveOptions) =>
            repository.resolve<T>(type, id, { ...resolveOptions, namespace }),
        };
      }
      case 'config-global':
        return repository;
      default: {
        const exhaustive: never = ref;
        throw new Error(`Unknown config doc ${JSON.stringify(exhaustive)}`);
      }
    }
  }

  private reportHealth(error?: Error): void {
    const { log } = this.options;
    if (error) {
      if (this.failing) {
        log.debug(`Still failing to read ui settings: ${error.message}`);
      } else {
        log.warn(`Failed to read ui settings, keeping the last known values: ${error.message}`);
      }
      this.failing = true;
      return;
    }
    if (this.failing) {
      this.failing = false;
      log.info('Reading ui settings recovered');
    }
  }
}
