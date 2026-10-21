/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
/* RESEARCH ONLY (Track 7.A). ACTUAL lever map: joins the 7.0 alerting atlas (predictions) with
 * what the island port actually does (island.ts / main_host.ts), and with observed host
 * crossings (t7a/stats). Rules are explicit and ordered; every edge gets exactly one row.
 *
 * usage: node research/t7a/lever_map.ts <atlas.json> <host-stats.json> <runs-in-stats> <out.json>
 */

import { readFileSync, writeFileSync } from 'fs';

const [atlasPath, statsPath, runsArg, outPath] = process.argv.slice(2);
const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
const stats = JSON.parse(readFileSync(statsPath, 'utf8'));
const runs = Number(runsArg);

const L = {
  colocate: 'Co-locate callee code with the runner',
  replicate: 'Replicate read-mostly data (snapshot + invalidation)',
  module: 'Module-specifier loading of contributed code',
  bundle: 'Per-run capability bundle',
  sync: 'Worker→main sync proxy (`Atomics.wait`; main never waits on a worker)',
  codec: 'Codecs for class instances/config objects',
  async: 'Async-ify an API (contract change)',
  refactor: 'Refactor/rewrite in owning plugin',
} as const;
const GENERIC = new Set<string>([L.colocate, L.replicate, L.module, L.bundle, L.sync, L.codec]);

type Plane = 'runner' | 'management' | 'boot';
type Status =
  | 'implemented'
  | 'stays-on-main'
  | 'fenced-main-only'
  | 'gap-semantic-loss'
  | 'gap-not-on-replay-path';
interface Row {
  id: string;
  from: string;
  to: string;
  kind: string;
  atlasCalls: number | null;
  atlasLever: string | null;
  plane: Plane;
  lever: string | null;
  generic: boolean;
  status: Status;
  mechanism: string;
}

const ISLAND = new Set(['alerting', 'actions', 'stackAlerts', 'stackConnectors', 'eventLog']);

const MANAGEMENT_PATTERNS = [
  /^core\.http/,
  /getRulesClient/,
  /getActionsClient\(\)\.create/,
  /core\.security\.authc\.apiKeys\.grantAsInternalUser/,
  /core\.security\.authc\.getPrincipal/,
  /^features\.getKibanaFeatures/,
  /^spaces\.spacesService\.createSpacesClient/,
  /^taskManager\.(schedule|get|removeIfExists|bulkDisable)$/,
  /createPointInTimeFinder/,
  /asScopedToNamespace\(\)\.(create|bulkCreate|delete|update|get)$/,
  /^core\.savedObjects\.getScopedClient\(\)\.(create|get)$/,
  /actions\.getActionsAuthorizationWithRequest/,
  /actions\.getActionsClientWithRequest\(\)\.(getBulk|isPreconfigured|isActionTypeEnabled|listTypes)/,
  /registerConnectorLifecycleListener/,
  /registerType\(arg0\)\.useSavedObjectReferences\.extractReferences/,
  /registerType\(arg0\)\.validate\.params/,
  /eventLog\.getClient/,
  /registerSavedObjectProvider/,
];

const classify = (
  from: string,
  to: string,
  kind: string
): Omit<Row, 'id' | 'from' | 'to' | 'kind' | 'atlasCalls' | 'atlasLever'> => {
  const row = (plane: Plane, lever: string | null, status: Status, mechanism: string) => ({
    plane,
    lever,
    generic: lever !== null && GENERIC.has(lever),
    status,
    mechanism,
  });

  // captured TaskRunnerContext fields: built by the REAL AlertingPlugin.start in the isolate
  if (to.startsWith('alerting.captured.')) {
    const field = to.slice('alerting.captured.'.length);
    const cfg = [
      'actionsConfigMap',
      'cancelAlertsOnRuleTimeout',
      'maxAlerts',
      'kibanaBaseUrl',
      'isServerless',
      'shouldGrantUiam',
      'apiKeyType',
    ];
    if (cfg.includes(field))
      return row(
        'boot',
        L.replicate,
        'implemented',
        'plugin config re-validated in isolate with the plugin schema + replicated env snapshot'
      );
    if (field === 'elasticsearch')
      return row(
        'boot',
        L.bundle,
        'implemented',
        'real Core ClusterClient rebuilt from kit internal capture; asScoped local'
      );
    if (['encryptedSavedObjectsClient', 'savedObjects', 'uiSettings'].includes(field))
      return row(
        'boot',
        L.bundle,
        'implemented',
        'async bridge to main real service (fake-request codec)'
      );
    if (['data', 'dataViews'].includes(field))
      return row(
        'boot',
        L.bundle,
        'gap-not-on-replay-path',
        'facade throws if used (searchSource/DSL-with-dataview rules need data plugin co-located or bridged)'
      );
    if (field === 'usageCounter')
      return row(
        'boot',
        null,
        'gap-semantic-loss',
        'usageCollection not provided in isolate: usage counters not incremented'
      );
    if (field === 'auditService')
      return row(
        'boot',
        L.colocate,
        'gap-semantic-loss',
        'audit sink fenced in isolate (audit events lost when audit logging enabled); forward via kit batch stream not implemented'
      );
    if (field === 'executionContext')
      return row(
        'boot',
        L.replicate,
        'implemented',
        'withContext pass-through; ES opaque-id from capture (per-task context labels not propagated)'
      );
    if (field === 'logger')
      return row(
        'boot',
        L.colocate,
        'implemented',
        'isolate logger to stderr (Kibana logging config/appenders not replicated)'
      );
    if (field === 'share')
      return row(
        'boot',
        L.colocate,
        'implemented',
        'share Locator class co-located + replicated locator ids/version/baseUrl'
      );
    if (field === 'spaceIdToNamespace')
      return row('boot', L.colocate, 'implemented', 'pure SavedObjectsUtils functions');
    if (field === 'alertStatusChangedOptIns' || field === 'alertingEventBus')
      return row(
        'boot',
        L.colocate,
        'implemented',
        'constructed by real plugin in isolate; no opt-ins registered anywhere at fd3138c (replicate if they appear)'
      );
    return row(
      'boot',
      L.colocate,
      'implemented',
      'constructed by the real plugin lifecycle inside the isolate'
    );
  }
  if (to === 'alerting.module.alertStatusChangedOptIns')
    return row(
      'runner',
      L.replicate,
      'implemented',
      'module singleton empty on both sides at fd3138c'
    );

  if (MANAGEMENT_PATTERNS.some((p) => p.test(to)) || from === 'core.http')
    return row(
      'management',
      null,
      'stays-on-main',
      'management plane (routes, rules/actions clients for CRUD) stays on main: avoid-the-cut'
    );

  if (from === 'taskManager' && to.startsWith('taskManager.registerTaskDefinitions('))
    return row(
      'runner',
      L.colocate,
      'implemented',
      'definition registered by the real plugin in the isolate; main TM stub dispatches (TM research seam)'
    );
  if (to.startsWith('taskManager.')) {
    if (/^taskManager\.(bulkSchedule|aggregate|fetch)$/.test(to))
      return row('runner', L.bundle, 'implemented', 'async bridge to main TM');
    return row(
      'runner',
      null,
      'fenced-main-only',
      'plugin-start maintenance scheduling fenced (main already scheduled)'
    );
  }
  if (to.startsWith('core.elasticsearch'))
    return row(
      'runner',
      L.bundle,
      'implemented',
      'isolate-local real Core ClusterClient (data never touches main)'
    );
  if (/^core\.savedObjects\.getAllIndices/.test(to))
    return row('runner', L.replicate, 'implemented', 'snapshot');
  if (to.startsWith('core.savedObjects'))
    return row(
      'runner',
      L.bundle,
      'implemented',
      'async SO bridge to main (real security/ESO wrappers on main)'
    );
  if (to.startsWith('encryptedSavedObjects'))
    return row('runner', L.bundle, 'implemented', 'async ESO bridge (keys stay on main)');
  if (to.startsWith('core.uiSettings'))
    return row('runner', L.bundle, 'implemented', 'async uiSettings bridge');
  if (to === 'core.security.authc.getCurrentUser')
    return row(
      'runner',
      L.replicate,
      'implemented',
      'fake requests have no auth state on main either → null'
    );
  if (to.startsWith('core.analytics'))
    return row(
      'runner',
      null,
      'gap-semantic-loss',
      'analytics.reportEvent fenced in isolate (telemetry event lost)'
    );
  if (to.startsWith('core.executionContext'))
    return row('runner', L.replicate, 'implemented', 'withContext pass-through');
  if (to.startsWith('core.getStartServices'))
    return row('boot', L.colocate, 'implemented', 'Core-lite');
  if (/^spaces\.spacesService\.(spaceIdToNamespace|getSpaceId|namespaceToSpaceId)/.test(to))
    return row(
      'runner',
      L.colocate,
      'implemented',
      'pure functions (fake request carries branded spaceId)'
    );
  if (to.startsWith('spaces.'))
    return row('runner', L.bundle, 'implemented', 'async spaces bridge');
  if (to === 'security.authz.mode.useRbacForRequest')
    return row(
      'runner',
      L.replicate,
      'implemented',
      'license/mode snapshot (invalidation on license change NOT pushed to a warm island)'
    );
  if (to.startsWith('security.authz.actions'))
    return row(
      'runner',
      L.colocate,
      'implemented',
      '@kbn/security-authorization-core Actions class'
    );
  if (to.startsWith('security.authz.checkPrivileges'))
    return row(
      'runner',
      L.bundle,
      'implemented',
      'async privilege-check bridge (factory local, check on main)'
    );
  if (to.startsWith('security.audit'))
    return row(
      'runner',
      null,
      'gap-semantic-loss',
      'audit log fenced in isolate (lost when audit enabled)'
    );
  if (to.startsWith('maintenanceWindows'))
    return row('runner', L.bundle, 'implemented', 'async maintenance-window client bridge');
  if (to.startsWith('share.'))
    return row('runner', L.colocate, 'implemented', 'share Locator co-located');
  if (to.startsWith('licensing'))
    return row('runner', L.replicate, 'implemented', 'license snapshot');
  if (from === 'actions' && /registerType\(arg0\)\.(executor|renderParameterTemplates)/.test(to))
    return row(
      'runner',
      L.colocate,
      'implemented',
      'connector registered by real stackConnectors lifecycle in isolate'
    );
  if (from === 'alerting' && /registerType\(arg0\)/.test(to))
    return row(
      'runner',
      L.colocate,
      'implemented',
      'rule type registered by real stackAlerts lifecycle in isolate'
    );
  const head = to.split('.')[0];
  if (ISLAND.has(from) && ISLAND.has(head))
    return row('runner', L.colocate, 'implemented', 'both ends inside the island');
  return row('runner', null, 'gap-not-on-replay-path', `unclassified (${kind})`);
};

const rows: Row[] = atlas.edges.map((e: Record<string, unknown>) => ({
  id: e.id,
  from: e.from,
  to: e.to,
  kind: e.kind,
  atlasCalls: e.calls,
  atlasLever: e.lever,
  ...classify(String(e.from), String(e.to), String(e.kind)),
}));

for (const r of rows)
  if (
    r.id.includes('agentBuilderPlatform') &&
    !r.to.includes('registerConnectorLifecycleListener')
  ) {
    r.status = 'gap-not-on-replay-path';
    r.lever = L.module;
    r.generic = true;
    r.mechanism =
      'connector type registered by a plugin outside the island: needs registrant in island or module identity';
  }

const denominator = rows.filter((r) => r.status !== 'stays-on-main');
const handled = (r: Row) => r.status === 'implemented' || r.status === 'fenced-main-only';
const genericHandled = (r: Row) => handled(r) && (r.generic || r.status === 'fenced-main-only');
const sumCalls = (xs: Row[]) => xs.reduce((a, r) => a + (r.atlasCalls ?? 0), 0);

const observed = Object.entries(
  stats.edges as Record<
    string,
    {
      calls: number;
      bytesIn: number;
      bytesOut: number;
      handlerMs: number;
      lever: string;
      generic: boolean;
    }
  >
)
  .filter(([edge]) => !edge.startsWith('execution.'))
  .map(([edge, v]) => ({
    edge,
    callsPerRun: v.calls / runs,
    mbIsolateToMainPerRun: v.bytesIn / runs / 1e6,
    mbMainToIsolatePerRun: v.bytesOut / runs / 1e6,
    mainHandlerMsPerRun: v.handlerMs / runs,
    lever: v.lever,
    generic: v.generic,
  }));

const byStatus: Record<string, number> = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
const summary = {
  atlas_edges: rows.length,
  by_status: byStatus,
  denominator_excluding_stays_on_main: denominator.length,
  unique_generic_handled: denominator.filter(genericHandled).length,
  unique_generic_fraction: denominator.filter(genericHandled).length / denominator.length,
  unique_bespoke: denominator.filter((r) => r.lever === L.async || r.lever === L.refactor).length,
  call_weighted_denominator: sumCalls(denominator),
  call_weighted_generic_handled: sumCalls(denominator.filter(genericHandled)),
  call_weighted_generic_fraction:
    sumCalls(denominator.filter(genericHandled)) / sumCalls(denominator),
  gaps: rows
    .filter((r) => r.status.startsWith('gap'))
    .map((r) => ({ to: r.to, status: r.status, calls: r.atlasCalls, mechanism: r.mechanism })),
  observed_crossings_per_run: observed,
};
writeFileSync(outPath, JSON.stringify({ summary, rows }, null, 1));
console.log(
  JSON.stringify(
    { ...summary, gaps: summary.gaps.length, observed_crossings_per_run: undefined },
    null,
    1
  )
);
