/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as ruleCreationConfig } from './classic.stateful.config';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

/**
 * Regression guard for the detection-watch-rule-creation eval suite's server shape.
 *
 * Every flag asserted here is load-bearing at boot and silent when dropped: the suite
 * still starts, but the managed rule-creation workflow is never installed and every
 * eval 404s with no configuration error to point at. `agenticInvestigations` is the
 * sharpest case -- it is a *required* plugin of alertzero and defaults to disabled, so
 * removing the flag cascade-disables alertzero itself.
 *
 * These assertions exist so that removal fails here, loudly, instead of surfacing as an
 * unexplained mass-404 in a live eval run.
 */
describe('evals_detection_watch_rule_creation config set', () => {
  const serverArgs = ruleCreationConfig.kbnTestServer.serverArgs;

  describe('load-bearing plugin flags', () => {
    // Each flag is listed with the failure mode it prevents, so a future reader
    // deleting one knows what breaks rather than guessing it is boilerplate.
    it.each([
      [
        '--xpack.alertzero.enabled=true',
        'alertzero owns initialize_managed_workflows; disabled means no workflow is installed',
      ],
      [
        '--xpack.agenticInvestigations.enabled=true',
        'required plugin of alertzero, defaults false; dropping it cascade-disables alertzero',
      ],
      [
        '--xpack.inbox.enabled=true',
        'approval-gate evals answer the review step through the inbox respond route',
      ],
      [
        '--uiSettings.overrides.workflows:ui:enabled=true',
        'the rule-creation workflow is not runnable without the Workflows UI',
      ],
      [
        '--uiSettings.overrides.workflows:aiAgent:enabled=true',
        "the workflow's ai.agent step requires agent settings",
      ],
    ])('pins %s', (flag) => {
      expect(serverArgs).toContain(flag);
    });
  });

  it('inherits the evals_tracing server args it layers onto', () => {
    // The config set spreads evals_tracing rather than defaultConfig, so OTLP export
    // stays on. If that spread is ever dropped, traces vanish and the trace-backed
    // evaluators silently score against an empty index.
    expect(serverArgs).toEqual(expect.arrayContaining(evalsTracingConfig.kbnTestServer.serverArgs));
  });

  it('keeps the ES-side inference URL from evals_tracing', () => {
    expect(ruleCreationConfig.esTestCluster.serverArgs).toEqual(
      expect.arrayContaining(evalsTracingConfig.esTestCluster.serverArgs)
    );
  });
});
