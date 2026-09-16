/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

const serverArgs = servers.kbnTestServer.serverArgs ?? [];

/**
 * Every flag below is load-bearing at BOOT time, so no runtime setting can substitute for it:
 * `alertzero` does not start when a required plugin is disabled, `inbox` owns the respond route
 * the suite resumes the review gate through, and the Workflows UI/agent flags gate the
 * `ai.agent` step the tuning workflow's diagnose node runs. Dropping one does not fail loudly —
 * the workflow is simply never installed and every fixture 404s on `Workflow not found`, which
 * reads downstream as a model failure.
 *
 * `--xpack.alertzero.enabled=true` and `--xpack.agenticInvestigations.enabled=true` are a pair:
 * `agenticInvestigations` is a requiredPlugin of `alertzero` and its own `enabled` defaults to
 * false, so enabling alertzero without it silently gets the plugin disabled by core anyway.
 */
const REQUIRED_SERVER_ARGS = [
  '--xpack.alertzero.enabled=true',
  '--xpack.agenticInvestigations.enabled=true',
  '--xpack.inbox.enabled=true',
  '--uiSettings.overrides.workflows:ui:enabled=true',
  '--uiSettings.overrides.workflows:aiAgent:enabled=true',
];

describe('evals_detection_watch_rule_tuning Scout config set', () => {
  it('passes every boot-time flag the tuning suite needs', () => {
    expect(REQUIRED_SERVER_ARGS.filter((arg) => !serverArgs.includes(arg))).toEqual([]);
  });

  it('enables the evals plugin so the suite can export its scores', () => {
    // Inherited from the evals_tracing set this one derives from; assert it survives the
    // override so a future edit that rebuilds serverArgs from scratch cannot drop it.
    expect(serverArgs).toContain('--xpack.evals.enabled=true');
  });

  it('declares each of those flags exactly once', () => {
    // A duplicated flag is ignored by Kibana, but here it would mean the flag was added to both
    // this set and the rule-creation set it derives from — the drift this file exists to avoid.
    const duplicated = REQUIRED_SERVER_ARGS.filter(
      (arg) => serverArgs.filter((present) => present === arg).length !== 1
    );
    expect(duplicated).toEqual([]);
  });
});
