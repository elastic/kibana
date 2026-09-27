/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

/**
 * Regression guard for the eval-stack flags the detection-watch-rule-creation suite needs at
 * boot.
 *
 * Every flag pinned below enables a plugin that is disabled by default, and a missing one fails
 * late: Kibana boots, the specs start, and only the managed-workflow lookup fails with
 * `404 Workflow not found`. No config set had a unit test, so nothing caught that class of edit.
 *
 * `agenticInvestigations` is the easy one to drop, because the suite never calls one of its
 * routes: it is a **required** plugin of `alertzero`
 * (`x-pack/solutions/security/plugins/alertzero/kibana.jsonc`), and Kibana cascade-disables
 * required plugins that are disabled. Without the flag alertzero never starts,
 * `initialize_managed_workflows.ts` never runs, and the managed rule-creation workflow is never
 * installed (see elastic/kibana#291045).
 */
describe('evals_detection_watch_rule_creation config set', () => {
  const { serverArgs } = servers.kbnTestServer;

  it('enables alertzero, which installs the managed rule-creation workflow at start', () => {
    expect(serverArgs).toContain('--xpack.alertzero.enabled=true');
  });

  it('enables agenticInvestigations, a required plugin of alertzero (#291045)', () => {
    expect(serverArgs).toContain('--xpack.agenticInvestigations.enabled=true');
  });

  it('enables the inbox plugin, which serves the approval-gate respond route', () => {
    expect(serverArgs).toContain('--xpack.inbox.enabled=true');
  });

  it('enables the Workflows UI and agent settings the workflow ai.agent step needs', () => {
    expect(serverArgs).toContain('--uiSettings.overrides.workflows:ui:enabled=true');
    expect(serverArgs).toContain('--uiSettings.overrides.workflows:aiAgent:enabled=true');
  });
});
