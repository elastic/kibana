/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { inRangeRt } from '@kbn/io-ts-utils';

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

export const timeout = inRangeRt(60, 60 * 15);
export type Timeout = t.TypeOf<typeof timeout>;
export const timeoutOrUndefined = t.union([timeout, t.undefined]);
export type TimeoutOrUndefined = t.TypeOf<typeof timeoutOrUndefined>;

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
