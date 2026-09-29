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
 * The suite measures a workflow the alertzero plugin installs at start. Kibana disables
 * alertzero when a required dependency is missing, and the only symptom downstream is a
 * 404 on the workflow -- which reads as "the eval broke", not "a plugin was off". These
 * assertions keep the enabling args together so one cannot be dropped without the other.
 */
describe('evals_detection_watch_rule_creation config set', () => {
  const args = servers.kbnTestServer.serverArgs;

  it('enables the alertzero plugin that installs the measured workflow', () => {
    expect(args).toContain('--xpack.alertzero.enabled=true');
  });

  it('enables agenticInvestigations, which alertzero requires and which defaults to off', () => {
    expect(args).toContain('--xpack.agenticInvestigations.enabled=true');
  });

  it('enables the inbox plugin used by the approval-gate tests', () => {
    expect(args).toContain('--xpack.inbox.enabled=true');
  });

  it('enables the workflows ai.agent ui settings the draft step needs', () => {
    expect(args).toContain('--uiSettings.overrides.workflows:ui:enabled=true');
    expect(args).toContain('--uiSettings.overrides.workflows:aiAgent:enabled=true');
  });
});
