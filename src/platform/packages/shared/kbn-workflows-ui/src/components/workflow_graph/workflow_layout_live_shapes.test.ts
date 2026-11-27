/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shapes taken from the workflow library shipped on a live instance, reduced to their
 * structure and renamed. The generated corpus covers random shapes; these keep the
 * specific ones that exposed layout bugs, or that stress the packer, from regressing.
 * Every fixture must satisfy every layout rule in both directions; where packing each
 * branch as one bounding box makes a graph wider, the fixture also has a width budget
 * so growth shows up as a failing test instead of a surprise.
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { LayoutDirection, WorkflowYaml } from '@kbn/workflows';
import { computeWorkflowLayout, WORKFLOW_COMPOUND_PADDING } from './workflow_layout_pipeline';
import { checkLayoutInvariants } from '../../test_utils/workflow_layout/check_layout_invariants';

type Step = Record<string, unknown>;

const http = (name: string, extra: Step = {}): Step => ({ name, type: 'http', ...extra });
const ifStep = (name: string, then: Step[], otherwise: Step[] = []): Step => ({
  name,
  type: 'if',
  condition: 'x',
  steps: then,
  ...(otherwise.length > 0 ? { else: otherwise } : {}),
});
const switchStep = (name: string, cases: Array<[string, Step[]]>, fallthrough?: Step[]): Step => ({
  name,
  type: 'switch',
  expression: 'value',
  cases: cases.map(([match, steps]) => ({ match, steps })),
  ...(fallthrough ? { default: fallthrough } : {}),
});
const loop = (name: string, steps: Step[], extra: Step = {}): Step => ({
  name,
  type: 'foreach',
  foreach: 'items',
  steps,
  ...extra,
});

const workflow = (steps: Step[], triggerTypes = ['manual']): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: triggerTypes.map((type) => ({ type, enabled: true })),
    steps,
  }) as unknown as WorkflowYaml;

const UUID_LABEL = 'f4f436c8-5c4a-4f61-b0cc-9e0d2a7b1c35';

interface Shape {
  readonly name: string;
  readonly workflow: WorkflowYaml;
  /** Widest the graph may be in TB, in px; absent when the shape has no width concern. */
  readonly widthBudget?: number;
}

const mergeStep = (name: string, body: Step[]): Step => ({ name, type: 'merge', steps: body });

const SHAPES: readonly Shape[] = [
  {
    // Not in the live library, but valid: a merge body shares its rows with the fork after it.
    name: 'merge body followed by a fork',
    workflow: workflow([
      mergeStep('combine', [http('merge_one'), http('merge_two')]),
      ifStep('gate', [http('then_step')], [http('else_step')]),
    ]),
  },
  {
    // zoom-get-meeting, teams-list: every else holds the next if, so each level adds a column.
    name: 'nested else cascade',
    workflow: workflow([
      http('route_a'),
      http('route_b'),
      ifStep(
        'gate_1',
        [http('leaf_1')],
        [
          ifStep(
            'gate_2',
            [http('leaf_2')],
            [
              ifStep(
                'gate_3',
                [http('leaf_3')],
                [ifStep('gate_4', [http('leaf_4')], [http('leaf_5')])]
              ),
            ]
          ),
        ]
      ),
    ]),
    // Five leaves side by side: 5 x 300 + 4 x 50.
    widthBudget: 1700,
  },
  {
    // windows-clickfix: switches in different branches share a row, with UUID case labels.
    name: 'sibling switches under a switch',
    workflow: workflow([
      switchStep(
        'route_delivery',
        [
          ['ineligible', [http('record_ineligible')]],
          [
            UUID_LABEL,
            [
              http('lookup_cases'),
              switchStep(
                'route_recovery',
                [
                  ['lookup_failed', [http('record_lookup_failed')]],
                  [
                    'repair',
                    [
                      http('attach_recovered'),
                      switchStep(
                        'route_recovered_attachment',
                        [
                          ['failed', [http('record_repair_failed')]],
                          ['complete', [http('record_repaired')]],
                          ['attach_related', [http('attach_related'), http('record_related')]],
                        ],
                        []
                      ),
                    ],
                  ],
                  [
                    'create',
                    [
                      http('create_case'),
                      switchStep(
                        'route_created_attachment',
                        [
                          ['failed', [http('record_create_failed')]],
                          ['complete', [http('record_created')]],
                          ['attach_related', [http('attach_created'), http('record_attached')]],
                        ],
                        []
                      ),
                    ],
                  ],
                ],
                []
              ),
            ],
          ],
        ],
        [http('record_default')]
      ),
      http('normalize_result'),
    ]),
  },
  {
    // block-user-credentials-ransomware: deep if/else with long bypass edges to a common tail.
    name: 'deep nested ifs sharing one tail',
    workflow: workflow(
      [
        ifStep(
          'validate_sid',
          [http('log_empty_sid')],
          [
            ifStep(
              'skip_system',
              [http('log_system')],
              [
                http('resolve_agent'),
                ifStep(
                  'agent_found',
                  [
                    http('check_history'),
                    ifStep(
                      'already_blocked',
                      [http('log_already_blocked')],
                      [
                        http('kill_sessions'),
                        http('log_kill'),
                        http('deny_logon'),
                        http('log_deny'),
                      ]
                    ),
                  ],
                  [http('log_no_agent')]
                ),
              ]
            ),
          ]
        ),
        http('log_summary'),
      ],
      ['alert', 'manual']
    ),
    widthBudget: 1700,
  },
  {
    // gti-*: a loop whose body ends in a failure-note fork, with a nested loop and
    // trailing empty "false" branches next to the box border.
    name: 'loop with a nested loop and trailing empty branches',
    workflow: workflow([
      http('bootstrap'),
      ifStep('no_targets', [http('log_no_targets')]),
      loop('enrich_each_item', [
        http('stash_iter'),
        ifStep('skip_on_fetch_error', [http('log_fetch_error'), http('skip_iteration')]),
        loop('paginate', [
          http('get_page'),
          ifStep('collect_page', [http('stash_page')], [http('stash_array')]),
          ifStep('handle_page_error', [http('stop_on_error')]),
        ]),
        http('compute_truncated'),
        ifStep('write_run_summary', [http('index_run_summary')]),
        ifStep('annotate_alert', [
          http('find_note'),
          http('build_link'),
          ifStep('write_note', [http('update_note')], [http('create_note')]),
          http('tag_alert'),
        ]),
        ifStep('report_standalone', [http('log_reference')]),
      ]),
      http('finalise'),
    ]),
  },
  {
    // sharepoint-list: many ifs in a row, each with a then and an empty else.
    name: 'consecutive ifs without else',
    workflow: workflow([
      http('start'),
      ...Array.from({ length: 9 }, (_, index) =>
        ifStep(`gate_${index}`, [http(`set_result_${index}`)])
      ),
      http('finish'),
    ]),
    // A then (300) and an empty else lane (the width of its "false" label) side by side.
    widthBudget: 420,
  },
  {
    // github-list: a 7-way switch with a default bypass and a label over 24 characters.
    name: 'wide switch with a long label',
    workflow: workflow([
      switchStep(
        'route_list',
        [
          ['listIssues', [http('list_issues')]],
          ['listPullRequests', [http('list_pull_requests')]],
          ['listCommits', [http('list_commits')]],
          ['listBranches', [http('list_branches')]],
          ['listReleases', [http('list_releases')]],
          [UUID_LABEL, [http('list_by_uuid')]],
          ['listTags', [http('list_tags')]],
        ],
        []
      ),
    ]),
    // Seven 300px cases and a default lane as wide as its label (72px), 50px apart.
    widthBudget: 2530,
  },
  {
    // inspired by the Censys loops: a wide switch under an if without else, inside a loop.
    name: 'loop around a wide switch under an if',
    workflow: workflow([
      http('build_targets'),
      loop('enrich_each_field', [
        http('fetch'),
        ifStep('dispatch', [
          switchStep(
            'route_by_field',
            ['url', 'web_property', 'destination', 'source'].map((match) => [
              match,
              [http(`write_${match}`)],
            ]),
            [http('log_unknown_field')]
          ),
        ]),
        ifStep('add_note', [http('add_alert_note')]),
      ]),
      http('summarise'),
    ]),
  },
];

const layoutOf = (wf: WorkflowYaml, direction: LayoutDirection) => {
  const transformed = transformWorkflowToGraph(wf);
  const layout = computeWorkflowLayout(transformed, { direction });
  return { transformed, layout };
};

describe('layout of shapes taken from real workflows', () => {
  describe.each(SHAPES)('$name', ({ workflow: wf, widthBudget }) => {
    it.each(['TB', 'LR'] as const)('%s: satisfies every layout rule', (direction) => {
      const { transformed, layout } = layoutOf(wf, direction);
      expect(
        checkLayoutInvariants({
          transformed,
          layout,
          direction,
          compoundPadding: WORKFLOW_COMPOUND_PADDING,
        })
      ).toEqual([]);
    });

    if (widthBudget !== undefined) {
      it(`TB: stays within ${widthBudget}px`, () => {
        const { layout } = layoutOf(wf, 'TB');
        const width =
          Math.max(...layout.nodes.map((n) => n.x + n.width)) -
          Math.min(...layout.nodes.map((n) => n.x));
        expect(width).toBeLessThanOrEqual(widthBudget);
      });
    }
  });
});
