/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { KnownGap } from './expect_rebuild';

/** A connector the fixture's steps use. The runner creates it, and puts its id where the workflow has `placeholder`. */
export interface FixtureConnector {
  readonly placeholder: string;
  readonly name: string;
  /** The action type, for example `.slack`. */
  readonly connectorTypeId: string;
  readonly config?: Record<string, string>;
  readonly secrets: Record<string, string>;
}

export interface GraphRebuildFixture {
  /** The workflow to rebuild, in `workflows/`. */
  readonly file: string;
  /** Problems the graph builder is known to have with this workflow; see README.md. */
  readonly knownGaps: readonly KnownGap[];
  /** The test's timeout; rebuilding goes through the UI one control at a time. */
  readonly timeoutMs: number;
  /** Connectors created before the rebuild and deleted after it. */
  readonly connectors?: readonly FixtureConnector[];
  /** The most the page's JS heap may hold, in MB, after the rebuild and a forced GC. */
  readonly heapBudgetMb?: number;
}

const FIVE_MINUTES = 5 * 60_000;

const defineFixtures = <Key extends string>(
  fixtures: Record<Key, GraphRebuildFixture>
): Record<Key, GraphRebuildFixture> => fixtures;

/** One entry per fixture; one spec per entry, so Scout's workers split them. */
export const GRAPH_REBUILD_FIXTURES = defineFixtures({
  settings_triggers: {
    file: 'settings_triggers.yaml',
    timeoutMs: FIVE_MINUTES,
    knownGaps: [],
  },
  flow_control: {
    file: 'flow_control.yaml',
    timeoutMs: FIVE_MINUTES,
    knownGaps: [],
  },
  error_handling: {
    file: 'error_handling.yaml',
    timeoutMs: FIVE_MINUTES,
    knownGaps: [],
  },
  references_editors: {
    file: 'references_editors.yaml',
    timeoutMs: FIVE_MINUTES,
    knownGaps: [],
  },
  long_workflow: {
    file: 'long_workflow.yaml',
    timeoutMs: 10 * 60_000,
    // 276 MB retained after a forced GC when measured (2026-11-13), with margin.
    heapBudgetMb: 420,
    knownGaps: [],
  },
  connectors: {
    file: 'connectors.yaml',
    timeoutMs: FIVE_MINUTES,
    connectors: [
      {
        placeholder: '__SLACK_CONNECTOR_ID__',
        name: 'scout-rebuild-slack',
        connectorTypeId: '.slack',
        // Creating a connector does not call out, so the URL is never reached.
        secrets: { webhookUrl: 'https://hooks.slack.com/services/T000/B000/scout' },
      },
    ],
    knownGaps: [],
  },
  data_transforms: {
    file: 'data_transforms.yaml',
    timeoutMs: FIVE_MINUTES,
    knownGaps: [
      {
        key: 'members_by_team | with.fields | different',
        reason:
          'A `$map` directive has no form control (the key/value cell is YAML-only for it), so the object is stored as a JSON string.',
      },
    ],
  },
});

export type GraphRebuildFixtureKey = keyof typeof GRAPH_REBUILD_FIXTURES;

/** The fixture's workflow, with each placeholder replaced by the id of its connector. */
export const loadGraphRebuildFixtureYaml = (
  key: GraphRebuildFixtureKey,
  connectorIds: Readonly<Record<string, string>> = {}
): string =>
  Object.entries(connectorIds).reduce(
    (yaml, [placeholder, id]) => yaml.split(placeholder).join(id),
    readFileSync(join(__dirname, 'workflows', GRAPH_REBUILD_FIXTURES[key].file), 'utf8')
  );
