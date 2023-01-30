/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const id = t.string;
export type Id = t.TypeOf<typeof id>;
export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;

export const agentSelection = t.type({
  agents: t.array(t.string),
  allAgentsSelected: t.boolean,
  platformsSelected: t.array(t.string),
  policiesSelected: t.array(t.string),
});

export type AgentSelection = t.TypeOf<typeof agentSelection>;
export const agentSelectionOrUndefined = t.union([agentSelection, t.undefined]);
export type AgentSelectionOrUndefined = t.TypeOf<typeof agentSelectionOrUndefined>;

export const description = t.string;
export type Description = t.TypeOf<typeof description>;
export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const platform = t.string;
export type Platform = t.TypeOf<typeof platform>;
export const platformOrUndefined = t.union([platform, t.undefined]);
export type PlatformOrUndefined = t.TypeOf<typeof platformOrUndefined>;

export const query = t.string;
export type Query = t.TypeOf<typeof query>;
export const queryOrUndefined = t.union([query, t.undefined]);
export type QueryOrUndefined = t.TypeOf<typeof queryOrUndefined>;

export const version = t.string;
export type Version = t.TypeOf<typeof version>;
export const versionOrUndefined = t.union([version, t.undefined]);
export type VersionOrUndefined = t.TypeOf<typeof versionOrUndefined>;

export const interval = t.string;
export type Interval = t.TypeOf<typeof interval>;
export const intervalOrUndefined = t.union([interval, t.undefined]);
export type IntervalOrUndefined = t.TypeOf<typeof intervalOrUndefined>;

export const snapshot = t.boolean;
export type Snapshot = t.TypeOf<typeof snapshot>;
export const snapshotOrUndefined = t.union([snapshot, t.undefined]);
export type SnapshotOrUndefined = t.TypeOf<typeof snapshotOrUndefined>;

export const removed = t.boolean;
export type Removed = t.TypeOf<typeof removed>;
export const removedOrUndefined = t.union([removed, t.undefined]);
export type RemovedOrUndefined = t.TypeOf<typeof removedOrUndefined>;

export const savedQueryId = t.string;
export type SavedQueryId = t.TypeOf<typeof savedQueryId>;
export const savedQueryIdOrUndefined = t.union([savedQueryId, t.undefined]);
export type SavedQueryIdOrUndefined = t.TypeOf<typeof savedQueryIdOrUndefined>;

export const packId = t.string;
export type PackId = t.TypeOf<typeof packId>;
export const packIdOrUndefined = t.union([packId, t.undefined]);
export type PackIdOrUndefined = t.TypeOf<typeof packIdOrUndefined>;

export const executionContext = t.type({
  name: t.union([t.string, t.undefined]),
  url: t.union([t.string, t.undefined]),
});

export type ExecutionContext = t.TypeOf<typeof executionContext>;
export const executionContextOrUndefined = t.union([executionContext, t.undefined]);
export type ExecutionContextOrUndefined = t.TypeOf<typeof executionContextOrUndefined>;

export const ecsMapping = t.record(
  t.string,
  t.partial({
    field: t.string,
    value: t.union([t.string, t.array(t.string)]),
  })
);
export type ECSMapping = t.TypeOf<typeof ecsMapping>;
export const ecsMappingOrUndefined = t.union([ecsMapping, t.undefined]);
export type ECSMappingOrUndefined = t.TypeOf<typeof ecsMappingOrUndefined>;

export const stringArrayOrUndefined = t.union([t.array(t.string), t.undefined]);
export type StringArrayOrUndefined = t.TypeOf<typeof stringArrayOrUndefined>;

export const arrayQueries = t.array(
  t.type({
    id,
    query,
    ecs_mapping: ecsMappingOrUndefined,
    version: versionOrUndefined,
    platform: platformOrUndefined,
    removed: removedOrUndefined,
    snapshot: snapshotOrUndefined,
  })
);
export type ArrayQueries = t.TypeOf<typeof arrayQueries>;
export const objectQueries = t.record(
  t.string,
  t.type({
    query,
    id,
    ecs_mapping: ecsMappingOrUndefined,
    version: versionOrUndefined,
    platform: platformOrUndefined,
    saved_query_id: savedQueryIdOrUndefined,
    removed: removedOrUndefined,
    snapshot: snapshotOrUndefined,
  })
);
export type ObjectQueries = t.TypeOf<typeof objectQueries>;
export const queries = t.union([arrayQueries, objectQueries]);
export type Queries = t.TypeOf<typeof queries>;
export const queriesOrUndefined = t.union([arrayQueries, t.undefined]); // in the future we might need to support `objectQueries` so use `queries` instead of `arrayQueries` - now removing this because of strange type issue where query is a number
export type QueriesOrUndefined = t.TypeOf<typeof queriesOrUndefined>;

export const createLiveQueryRequestBodySchema = t.partial({
  agent_ids: t.array(t.string),
  agent_all: t.union([t.boolean, t.undefined]),
  agent_platforms: t.array(t.string),
  agent_policy_ids: t.array(t.string),
  query: queryOrUndefined,
  queries: queriesOrUndefined,
  saved_query_id: savedQueryIdOrUndefined,
  ecs_mapping: ecsMappingOrUndefined,
  pack_id: packIdOrUndefined,
  alert_ids: t.array(t.string),
  case_ids: t.array(t.string),
  event_ids: t.array(t.string),
  metadata: t.union([t.object, t.undefined]),
});

export type CreateLiveQueryRequestBodySchema = t.OutputOf<typeof createLiveQueryRequestBodySchema>;

// TODO check if we can't reuse something else, or at least refactor into io-ts
export interface LiveQueryDetailsItem {
  action_id: string;
  expiration: string;
  '@timestamp': string;
  agent_all: boolean;
  agent_ids: string[];
  agent_platforoms: string[];
  agent_policy_ids: string[];
  agents: string[];
  user_id?: string;
  pack_id?: string;
  pack_name?: string;
  pack_prebuilt?: boolean;
  status?: string;
  queries?: PackQueriesQuery[];
}

export interface PackQueriesQuery {
  action_id: string;
  id: string;
  query: string;
  agents: string[];
  ecs_mapping?: ECSMapping;
  version?: string;
  platform?: string;
  saved_query_id?: string;
  expiration?: string;
}
