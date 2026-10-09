/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import {
  buildWorkflowSettingsNodes,
  SETTINGS_COMPACT_HEIGHT,
  SETTINGS_COMPACT_WIDTH,
  SETTINGS_GROUP_HEADER_HEIGHT,
  SETTINGS_GROUP_NODE_ID,
  SETTINGS_GROUP_PAD,
  SETTINGS_TO_FLOW_GAP,
} from './build_settings_nodes';
import { PENDING_NODE_HEIGHT, PENDING_NODE_WIDTH } from './pending_insert';

const topInset = SETTINGS_GROUP_PAD + SETTINGS_GROUP_HEADER_HEIGHT + SETTINGS_GROUP_PAD;

const triggerAt = (x: number, y: number, id = 'trigger:0'): Node => ({
  id,
  type: 'trigger',
  position: { x, y },
  width: PENDING_NODE_WIDTH,
  height: PENDING_NODE_HEIGHT,
  data: { label: 'Manual', stepType: 'manual', isTrigger: true },
});

describe('buildWorkflowSettingsNodes', () => {
  it('places a group backdrop and three settings cards in a row above triggers in TB', () => {
    const nodes = buildWorkflowSettingsNodes([triggerAt(0, 200)], 'TB', {
      workflowName: 'Demo',
      constantsCount: 2,
      outputsCount: 0,
      selectedKind: 'constants',
    });

    expect(nodes).toHaveLength(4);
    expect(nodes[0]).toMatchObject({
      id: SETTINGS_GROUP_NODE_ID,
      type: 'settingsGroup',
      data: { hasSelection: true },
    });

    const cards = nodes.slice(1);
    expect(cards.map((n) => n.id)).toEqual([
      'settings:info',
      'settings:constants',
      'settings:outputs',
    ]);
    expect(cards.every((n) => n.type === 'settings')).toBe(true);
    expect(cards.every((n) => n.parentId === SETTINGS_GROUP_NODE_ID)).toBe(true);
    expect(cards.every((n) => n.width === PENDING_NODE_WIDTH)).toBe(true);
    expect(cards.every((n) => n.height === PENDING_NODE_HEIGHT)).toBe(true);

    const rowWidth = 3 * PENDING_NODE_WIDTH + 2 * SETTINGS_GROUP_PAD;
    const expectedGroupY =
      200 -
      SETTINGS_TO_FLOW_GAP -
      PENDING_NODE_HEIGHT -
      SETTINGS_GROUP_PAD -
      (topInset - SETTINGS_GROUP_PAD);
    const bandMidX = PENDING_NODE_WIDTH / 2;
    const expectedGroupX = bandMidX - rowWidth / 2 - SETTINGS_GROUP_PAD;
    expect(nodes[0].position.x).toBeCloseTo(expectedGroupX);
    expect(nodes[0].position.y).toBe(expectedGroupY);
    expect(nodes[0].width).toBe(rowWidth + SETTINGS_GROUP_PAD * 2);
    expect(nodes[0].height).toBe(topInset + PENDING_NODE_HEIGHT + SETTINGS_GROUP_PAD);

    // Children sit below the header band; gaps match outer pad.
    expect(cards[0].position).toEqual({ x: SETTINGS_GROUP_PAD, y: topInset });
    expect(cards[1].position.x).toBe(SETTINGS_GROUP_PAD + PENDING_NODE_WIDTH + SETTINGS_GROUP_PAD);
    expect(cards[1].selected).toBe(true);
    expect(cards[0].selected).toBe(false);
    expect(cards[0].data).toMatchObject({ kind: 'info', label: 'Demo', compact: false });
  });

  it('stacks settings cards vertically when cardLayout is vertical', () => {
    const nodes = buildWorkflowSettingsNodes([triggerAt(0, 400)], 'TB', {
      workflowName: 'Demo',
      constantsCount: 0,
      outputsCount: 0,
      cardLayout: 'vertical',
    });

    const cards = nodes.filter((n) => n.type === 'settings');
    expect(cards.every((n) => n.position.x === SETTINGS_GROUP_PAD)).toBe(true);
    expect(cards[0].position.y).toBe(topInset);
    expect(cards[1].position.y - cards[0].position.y).toBe(
      PENDING_NODE_HEIGHT + SETTINGS_GROUP_PAD
    );
    expect(nodes[0].width).toBe(PENDING_NODE_WIDTH + SETTINGS_GROUP_PAD * 2);
    expect(nodes[0].height).toBe(
      topInset + 3 * PENDING_NODE_HEIGHT + 2 * SETTINGS_GROUP_PAD + SETTINGS_GROUP_PAD
    );
  });

  it('uses compact card sizes when cardLayout is compact', () => {
    const nodes = buildWorkflowSettingsNodes([triggerAt(0, 200)], 'TB', {
      workflowName: 'Demo',
      constantsCount: 1,
      outputsCount: 0,
      cardLayout: 'compact',
    });

    const cards = nodes.filter((n) => n.type === 'settings');
    expect(cards.every((n) => n.width === SETTINGS_COMPACT_WIDTH)).toBe(true);
    expect(cards.every((n) => n.height === SETTINGS_COMPACT_HEIGHT)).toBe(true);
    expect(cards.every((n) => (n.data as { compact?: boolean }).compact === true)).toBe(true);
    expect(cards[1].position.x).toBe(
      SETTINGS_GROUP_PAD + SETTINGS_COMPACT_WIDTH + SETTINGS_GROUP_PAD
    );
  });

  it('places settings nodes left of triggers in LR', () => {
    const nodes = buildWorkflowSettingsNodes([triggerAt(400, 0)], 'LR', {
      workflowName: 'Demo',
      constantsCount: 0,
      outputsCount: 1,
      cardLayout: 'vertical',
    });

    const cards = nodes.filter((n) => n.type === 'settings');
    expect(cards.every((n) => n.position.x === SETTINGS_GROUP_PAD)).toBe(true);
    expect(cards[1].position.y - cards[0].position.y).toBe(
      PENDING_NODE_HEIGHT + SETTINGS_GROUP_PAD
    );
  });

  it('returns empty when the layout has no nodes', () => {
    expect(
      buildWorkflowSettingsNodes([], 'TB', {
        workflowName: 'Demo',
        constantsCount: 0,
        outputsCount: 0,
      })
    ).toEqual([]);
  });
});
