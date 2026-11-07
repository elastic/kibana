/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  HousekeepingFinding,
  HousekeepingFindingKind,
  HousekeepingFix,
  HousekeepingResource,
} from '../common';

export interface HousekeepingContext {
  /** Scoped to the current user, so Elasticsearch enforces their privileges. */
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  isServerless: boolean;
  abortSignal: AbortSignal;
  logger: Logger;
  /**
   * Shares a response between all the providers and checks of one run. `fetch` gets the signal of
   * the run, not of the caller, so a caller that times out doesn't abort it for the others.
   */
  fetchOnce<T>(key: string, fetch: (abortSignal: AbortSignal) => Promise<T>): Promise<T>;
}

export interface HousekeepingReference {
  targetType: string;
  targetId: string;
  /** How the resource points at the target, such as `index.default_pipeline`. */
  via: string;
  /** What breaks when the target doesn't exist. */
  impact?: string;
  /** Counts as a use when the target exists, but isn't broken when it doesn't. */
  optional?: boolean;
}

export interface HousekeepingResourceEntry extends Omit<HousekeepingResource, 'locator'> {
  references?: HousekeepingReference[];
  /** Evidence of use that references can't show, such as documents processed by a pipeline. */
  inUse?: boolean;
  /** Short facts for the row when the resource is reported, such as how long it was observed. */
  details?: string[];
  evidence?: Record<string, unknown>;
}

/** A type whose unused resources can't be told apart in this run, with the reason. */
export interface HousekeepingUnusedNotChecked {
  type: string;
  reason: string;
}

export interface HousekeepingProviderResult {
  resources: HousekeepingResourceEntry[];
  unusedNotChecked?: HousekeepingUnusedNotChecked[];
}

export interface HousekeepingResourceTypeDefinition {
  id: string;
  label: string;
  /** When set, resources of this type with no incoming references and no use are reported. */
  unused?: {
    message: string;
    /** The request that removes an unused resource of this type. */
    getFix?(resourceId: string): HousekeepingFix;
  };
  /** Where the owning plugin shows a resource of this type, resolved with the share plugin. */
  locator?: {
    id: string;
    getParams(resourceId: string): Record<string, string | number | boolean>;
  };
  /**
   * The definition of a resource of this type, such as the body of a template. It goes to
   * Agent Builder with the finding, so the agent doesn't have to look it up.
   */
  describe?(resourceId: string, context: HousekeepingContext): Promise<unknown>;
}

/**
 * Describes the resources a plugin owns and what they point at. Housekeeping builds a graph from
 * every provider and reports broken references and unused resources from it.
 */
export interface HousekeepingResourceProvider {
  id: string;
  title: string;
  resourceTypes: HousekeepingResourceTypeDefinition[];
  /** Resource types this provider references, so a scoped run includes it. */
  referencedTypes?: string[];
  isAvailable?(context: HousekeepingContext): boolean;
  listResources(
    context: HousekeepingContext
  ): Promise<HousekeepingResourceEntry[] | HousekeepingProviderResult>;
}

export type HousekeepingCheckFinding = Omit<HousekeepingFinding, 'id'>;

/** For anything that isn't a reference between resources, such as data streams without retention. */
export interface HousekeepingCheck {
  id: string;
  title: string;
  description: string;
  resourceTypes: string[];
  /** Defaults to `risk`. */
  kind?: HousekeepingFindingKind;
  isAvailable?(context: HousekeepingContext): boolean;
  run(context: HousekeepingContext): Promise<HousekeepingCheckFinding[]>;
}

export interface HousekeepingServerSetup {
  registerResourceProvider(provider: HousekeepingResourceProvider): void;
  registerCheck(check: HousekeepingCheck): void;
}
