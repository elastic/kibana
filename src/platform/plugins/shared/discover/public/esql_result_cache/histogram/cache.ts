/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { createHtmlPortalNode, type HtmlPortalNode } from 'react-reverse-portal';
import type {
  UnifiedHistogramApi,
  UnifiedHistogramPartialLayoutProps,
  UseUnifiedHistogramProps,
} from '@kbn/unified-histogram';
import { mountEsqlHistogramCacheHost } from './host';
import { withoutRouteCallbacks, withCurrentRouteCallbacks } from './props';

interface CachedHistogramIdentity {
  generation: number;
  tabId: string;
}

export interface CachedHistogramAttachment extends CachedHistogramIdentity {
  routeActionsPortalNode: HtmlPortalNode;
}

export interface CachedHistogramHostEntry extends CachedHistogramAttachment {
  api?: UnifiedHistogramApi;
  attached: boolean;
  fingerprint: string;
  hasLoaded: boolean;
  instanceId: number;
  layoutProps?: UnifiedHistogramPartialLayoutProps;
  portalNode: HtmlPortalNode;
  props: UseUnifiedHistogramProps;
}

interface CachedHistogramSnapshot extends CachedHistogramIdentity {
  attached: boolean;
  api?: UnifiedHistogramApi;
  layoutProps?: UnifiedHistogramPartialLayoutProps;
  portalNode: HtmlPortalNode;
}

interface HistogramCacheState {
  entries: readonly CachedHistogramHostEntry[];
  snapshots: ReadonlyMap<string, CachedHistogramSnapshot>;
}

/** Owns cached histogram instances independently of the Discover route. */
export class EsqlHistogramCache {
  // TODO: Measure cached Lens memory and add a TTL/LRU policy for detached entries.
  private readonly entries = new Map<string, CachedHistogramHostEntry>();
  private readonly listeners = new Set<() => void>();
  private generation = 0;
  private instanceId = 0;
  private state: HistogramCacheState = { entries: [], snapshots: new Map() };
  private unmountHost?: () => void;

  constructor(private readonly core: CoreStart) {}

  public dispose() {
    this.entries.clear();
    this.publish();
    this.unmountHost?.();
    this.unmountHost = undefined;
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getState = () => this.state;

  public attach({
    fingerprint,
    props,
    tabId,
  }: {
    fingerprint: string;
    props: UseUnifiedHistogramProps;
    tabId: string;
  }): CachedHistogramAttachment {
    this.ensureHost();

    const cachedEntry = this.entries.get(tabId);
    const generation = ++this.generation;
    let entry: CachedHistogramHostEntry;
    if (cachedEntry?.fingerprint === fingerprint && cachedEntry.hasLoaded) {
      // Let the existing Lens instance apply fresh props without hiding its previous chart.
      entry = {
        ...cachedEntry,
        attached: true,
        generation,
        props: withCurrentRouteCallbacks(cachedEntry.props, props),
      };
    } else {
      entry = {
        attached: true,
        fingerprint,
        generation,
        hasLoaded: false,
        instanceId: ++this.instanceId,
        portalNode: createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
        props,
        routeActionsPortalNode: createHtmlPortalNode(),
        tabId,
      };
    }

    this.entries.set(tabId, entry);
    this.publish();
    return { generation, routeActionsPortalNode: entry.routeActionsPortalNode, tabId };
  }

  public updateAttachment({
    attachment,
    fingerprint,
    props,
  }: {
    attachment: CachedHistogramAttachment;
    fingerprint: string;
    props: UseUnifiedHistogramProps;
  }) {
    const entry = this.getAttachedEntry(attachment);
    if (!entry) {
      return;
    }

    const fingerprintChanged = entry.fingerprint !== fingerprint;
    this.entries.set(entry.tabId, {
      ...entry,
      fingerprint,
      // The updated chart must load successfully before it can be kept on detach.
      hasLoaded: fingerprintChanged ? false : entry.hasLoaded,
      props: withCurrentRouteCallbacks(entry.props, props),
    });
    this.publish();
  }

  public markLoaded(
    loadedEntry: CachedHistogramIdentity & Pick<CachedHistogramHostEntry, 'fingerprint'>
  ) {
    const entry = this.getAttachedEntry(loadedEntry);
    if (!entry || entry.fingerprint !== loadedEntry.fingerprint || entry.hasLoaded) {
      return;
    }

    this.entries.set(entry.tabId, { ...entry, hasLoaded: true });
    this.publish();
  }

  public detach(attachment: CachedHistogramAttachment) {
    const entry = this.getAttachedEntry(attachment);
    if (!entry) {
      return;
    }

    // Never cache a chart whose current render has not been verified.
    if (!entry.hasLoaded) {
      this.entries.delete(entry.tabId);
      this.publish();
      return;
    }

    this.entries.set(entry.tabId, {
      ...entry,
      attached: false,
      props: withoutRouteCallbacks(entry.props),
    });
    this.publish();
  }

  public disposeTab(tabId: string) {
    if (this.entries.delete(tabId)) {
      this.publish();
    }
  }

  public reconcile(openTabIds: readonly string[]) {
    const openTabs = new Set(openTabIds);
    let changed = false;
    for (const tabId of this.entries.keys()) {
      if (!openTabs.has(tabId)) {
        this.entries.delete(tabId);
        changed = true;
      }
    }
    if (changed) {
      this.publish();
    }
  }

  public updateHostOutput({
    api,
    generation,
    layoutProps,
    tabId,
  }: CachedHistogramIdentity & {
    api: UnifiedHistogramApi;
    layoutProps?: UnifiedHistogramPartialLayoutProps;
  }) {
    const entry = this.getAttachedEntry({ generation, tabId });
    if (!entry) {
      return;
    }

    this.entries.set(tabId, { ...entry, api, layoutProps });
    this.publish();
  }

  private getAttachedEntry({ generation, tabId }: CachedHistogramIdentity) {
    const entry = this.entries.get(tabId);
    return entry?.generation === generation ? entry : undefined;
  }

  private ensureHost() {
    this.unmountHost ??= mountEsqlHistogramCacheHost(this.core, this);
  }

  private publish() {
    this.state = {
      entries: Array.from(this.entries.values()),
      snapshots: new Map<string, CachedHistogramSnapshot>(
        Array.from(this.entries.entries(), ([tabId, entry]) => [
          tabId,
          {
            api: entry.api,
            attached: entry.attached,
            generation: entry.generation,
            layoutProps: entry.layoutProps,
            portalNode: entry.portalNode,
            tabId,
          },
        ])
      ),
    };
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
