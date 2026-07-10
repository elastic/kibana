/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Turns the flyout's authored topology (a focal node + its direct neighbours)
 * into an arbitrarily deep dependency graph and lays it out by depth.
 *
 * The authored templates only describe one hop from the focal entity. To show
 * "what's nested underneath" we synthesise descendants deterministically along
 * the natural entity-kind hierarchy (cluster → node → pod → container, host →
 * pod → container, namespace/deployment → pod, service → downstream service +
 * database). Because the hierarchy is a DAG that bottoms out at leaf kinds
 * (container / database / …), the expansion terminates on its own; the
 * `MAX_DEPTH` / `MAX_NODES` guards are only belt-and-suspenders against an
 * unexpected cycle.
 *
 * Everything is seeded off the node label so the same entity always produces
 * the same subtree (stable across re-renders and coherent with what a click
 * opens).
 */

import type { EntityKind } from './kind_templates';
import { entityTypeToKind, inferEntityKind } from './kind_templates';
import type { RelatedEntity, RelatedEntityHealth, RelationshipsTabData } from './fake_entity_tabs';

export interface TopologyLayoutNode {
  readonly id: string;
  readonly label: string;
  readonly focal: boolean;
  readonly health?: RelatedEntityHealth;
  readonly entityType?: string;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
}

export interface TopologyLayoutEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly emphasized?: boolean;
}

export interface TopologyLayout {
  readonly nodes: readonly TopologyLayoutNode[];
  readonly edges: readonly TopologyLayoutEdge[];
  readonly width: number;
  readonly height: number;
}

interface WorkingNode {
  id: string;
  label: string;
  focal: boolean;
  health?: RelatedEntityHealth;
  entityType?: string;
  synthetic: boolean;
  synthDepth: number;
  /** Never expanded further (e.g. the host node a pod "runs on"). */
  terminal: boolean;
  /** Already sits under a node/host ancestor, so it doesn't need a "runs on" node of its own. */
  underHost: boolean;
}

interface WorkingEdge {
  from: string;
  to: string;
  emphasized?: boolean;
}

interface ChildSpec {
  readonly kindLabel: string;
  readonly entityType: string;
  readonly count: (parentLabel: string) => number;
}

// How deep the synthetic tree may grow / how many nodes it may hold. The
// hierarchy terminates on its own; these only guard against surprises.
const MAX_DEPTH = 8;
const MAX_NODES = 60;

// Kinds whose synthetic descendants keep expanding (the infrastructure
// hierarchy). Synthetic leaves like a downstream service or a database are
// intentionally left un-expanded so the graph doesn't recurse forever.
const EXPANDABLE_SYNTHETIC_KINDS: ReadonlySet<EntityKind> = new Set<EntityKind>([
  'cluster',
  'node',
  'host',
  'namespace',
  'deployment',
  'pod',
]);

const CHILD_SPECS: Partial<Record<EntityKind, readonly ChildSpec[]>> = {
  cluster: [{ kindLabel: 'node', entityType: 'kubernetes.node', count: (l) => 2 + (hash(l) % 2) }],
  node: [{ kindLabel: 'pod', entityType: 'kubernetes.pod', count: (l) => 2 + (hash(l) % 2) }],
  host: [{ kindLabel: 'pod', entityType: 'kubernetes.pod', count: (l) => 2 + (hash(l) % 2) }],
  namespace: [{ kindLabel: 'pod', entityType: 'kubernetes.pod', count: (l) => 2 + (hash(l) % 2) }],
  deployment: [{ kindLabel: 'pod', entityType: 'kubernetes.pod', count: (l) => 2 + (hash(l) % 2) }],
  pod: [
    { kindLabel: 'container', entityType: 'kubernetes.container', count: (l) => 1 + (hash(l) % 2) },
  ],
  service: [
    { kindLabel: 'svc', entityType: 'apm.service', count: () => 1 },
    { kindLabel: 'db', entityType: 'postgresql', count: () => 1 },
  ],
};

// Deterministic djb2-style hash (no bitwise ops, to satisfy `no-bitwise`) so
// the synthesised subtree is stable for a given entity across re-renders.
const hash = (input: string): number => {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return h;
};

const hash4 = (input: string): string => (hash(input) % 0x10000).toString(16).padStart(4, '0');

// Mostly-healthy seeded health, biased toward the parent's health so an
// unhealthy branch visually "spreads" downward the way a real incident does.
const seededHealth = (label: string, parentHealth?: RelatedEntityHealth): RelatedEntityHealth => {
  const r = hash(`${label}:health`) % 100;
  if (parentHealth === 'Unhealthy') {
    if (r < 45) return 'Unhealthy';
    if (r < 70) return 'At risk';
    return 'Healthy';
  }
  if (parentHealth === 'At risk') {
    if (r < 18) return 'Unhealthy';
    if (r < 40) return 'At risk';
    return 'Healthy';
  }
  if (r < 8) return 'Unhealthy';
  if (r < 20) return 'At risk';
  return 'Healthy';
};

const kindOf = (node: WorkingNode): EntityKind | undefined =>
  entityTypeToKind(node.entityType) ?? inferEntityKind(node.label);

// Layout geometry (SVG user units; the container scales this to fit).
const MARGIN_X = 48;
const MARGIN_Y = 40;
const COL_WIDTH = 150;
const ROW_HEIGHT = 62;
const MIN_HEIGHT = 240;

// The node every pod "runs on" in the fake data — mirrors the `kubernetes.node`
// related entity hard-coded by the pod kind template (and the PayFlow story),
// so a pod's node in a service's topology is the *same* `node-prod-eu-04` the
// pod's own flyout shows under "Runs on" (rather than an invented name).
const POD_RUNS_ON_NODE_NAME = 'node-prod-eu-04';

/**
 * Expand `topology` into a deep graph and compute an x/y position for every
 * node (depth increases left → right; siblings stack vertically, centred).
 */
export const buildTopologyLayout = (
  topology: RelationshipsTabData['topology'],
  related: readonly RelatedEntity[]
): TopologyLayout => {
  const relatedByName = new Map<string, RelatedEntity>();
  for (const entity of related) {
    relatedByName.set(entity.name, entity);
  }

  const nodes: WorkingNode[] = topology.nodes.map((node) => {
    const match = relatedByName.get(node.label);
    return {
      id: node.id,
      label: node.label,
      focal: Boolean(node.focal),
      health: node.focal ? topology.focalHealth : match?.health,
      entityType: match?.entityType,
      synthetic: false,
      synthDepth: node.focal ? 0 : 1,
      terminal: false,
      underHost: false,
    };
  });
  const edges: WorkingEdge[] = topology.edges.map((edge) => ({ ...edge }));
  const byId = new Map<string, WorkingNode>(nodes.map((node) => [node.id, node]));

  // Track a single vertex per shared label (e.g. the host node many pods run
  // on) so it's drawn once and every pod connects to the same circle, matching
  // how one node hosts many pods, and seeded from the authored nodes so we
  // reuse an existing one instead of duplicating it.
  const sharedNodeIdByLabel = new Map<string, string>();
  for (const node of nodes) {
    sharedNodeIdByLabel.set(node.label, node.id);
  }

  // Breadth-first synthesis so the whole tier is added before descending.
  const queue: string[] = nodes.filter((node) => !node.focal).map((node) => node.id);

  const addChild = (
    parent: WorkingNode,
    kindLabel: string,
    entityType: string,
    index: number,
    options: { terminal: boolean; underHost: boolean }
  ): void => {
    const label = `${kindLabel}-${hash4(`${parent.label}:${kindLabel}:${index}`)}`;
    const id = `${parent.id}::${kindLabel}-${index}`;
    if (byId.has(id)) return;
    const child: WorkingNode = {
      id,
      label,
      focal: false,
      health: seededHealth(label, parent.health),
      entityType,
      synthetic: true,
      synthDepth: parent.synthDepth + 1,
      terminal: options.terminal,
      underHost: options.underHost,
    };
    byId.set(id, child);
    nodes.push(child);
    edges.push({ from: parent.id, to: id });
    if (!options.terminal) queue.push(id);
  };

  while (queue.length > 0 && byId.size < MAX_NODES) {
    const parent = byId.get(queue.shift()!)!;
    // A "runs on" host node (or any terminal leaf) is a dead end — expanding
    // it would recurse node → pod → node forever.
    if (parent.terminal) continue;
    if (parent.synthDepth >= MAX_DEPTH) continue;
    const kind = kindOf(parent);
    if (parent.synthetic && (!kind || !EXPANDABLE_SYNTHETIC_KINDS.has(kind))) continue;
    // Descendants of a node/host are "under a host", so their own pods don't
    // need to re-surface a redundant "runs on" node.
    const childUnderHost = parent.underHost || kind === 'node' || kind === 'host';
    const specs = kind ? CHILD_SPECS[kind] : undefined;
    if (specs) {
      for (const spec of specs) {
        const count = Math.max(1, spec.count(parent.label));
        for (let i = 0; i < count; i++) {
          if (byId.size >= MAX_NODES) break;
          addChild(parent, spec.kindLabel, spec.entityType, i, {
            terminal: false,
            underHost: childUnderHost,
          });
        }
      }
    }
    // A pod runs on a node — surface the *real* host node (`node-prod-eu-04`,
    // coherent with the pod's own flyout) unless the pod already hangs off a
    // node/host (cluster → node → pod), where the node is already on screen.
    // The node is a single shared, terminal vertex: every pod connects to the
    // same circle and we don't loop back into its pods.
    if (kind === 'pod' && !parent.underHost && byId.size < MAX_NODES) {
      const existingId = sharedNodeIdByLabel.get(POD_RUNS_ON_NODE_NAME);
      if (existingId) {
        edges.push({ from: parent.id, to: existingId });
      } else {
        const id = `shared::${POD_RUNS_ON_NODE_NAME}`;
        const hostNode: WorkingNode = {
          id,
          label: POD_RUNS_ON_NODE_NAME,
          focal: false,
          health: parent.health ?? seededHealth(POD_RUNS_ON_NODE_NAME),
          entityType: 'kubernetes.node',
          synthetic: true,
          synthDepth: parent.synthDepth + 1,
          terminal: true,
          underHost: true,
        };
        byId.set(id, hostNode);
        nodes.push(hostNode);
        edges.push({ from: parent.id, to: id });
        sharedNodeIdByLabel.set(POD_RUNS_ON_NODE_NAME, id);
      }
    }
  }

  // Depth from the focal node, treating edges as undirected so an inbound
  // dependency (e.g. a load-generator pointing at the focal) still lands one
  // hop out rather than being stranded.
  const adjacency = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const list = adjacency.get(a);
    if (list) list.push(b);
    else adjacency.set(a, [b]);
  };
  for (const edge of edges) {
    link(edge.from, edge.to);
    link(edge.to, edge.from);
  }
  const focal = nodes.find((node) => node.focal) ?? nodes[0];
  const depthById = new Map<string, number>();
  if (focal) {
    depthById.set(focal.id, 0);
    const bfs: string[] = [focal.id];
    while (bfs.length > 0) {
      const current = bfs.shift()!;
      const currentDepth = depthById.get(current)!;
      for (const next of adjacency.get(current) ?? []) {
        if (!depthById.has(next)) {
          depthById.set(next, currentDepth + 1);
          bfs.push(next);
        }
      }
    }
  }
  // Any node not reachable from the focal (shouldn't happen) trails one column
  // past the deepest reached node so it stays visible.
  const maxReachedDepth = Math.max(0, ...Array.from(depthById.values()));
  for (const node of nodes) {
    if (!depthById.has(node.id)) depthById.set(node.id, maxReachedDepth + 1);
  }

  // Group by depth, preserving insertion order within a tier.
  const tiers = new Map<number, WorkingNode[]>();
  for (const node of nodes) {
    const depth = depthById.get(node.id)!;
    const tier = tiers.get(depth);
    if (tier) tier.push(node);
    else tiers.set(depth, [node]);
  }
  const maxDepth = Math.max(0, ...Array.from(tiers.keys()));
  const maxTierSize = Math.max(1, ...Array.from(tiers.values(), (tier) => tier.length));

  const width = MARGIN_X * 2 + maxDepth * COL_WIDTH;
  const height = Math.max(MIN_HEIGHT, MARGIN_Y * 2 + (maxTierSize - 1) * ROW_HEIGHT);
  const centerY = height / 2;

  const positioned = new Map<string, TopologyLayoutNode>();
  for (const [depth, tier] of tiers) {
    const x = MARGIN_X + depth * COL_WIDTH;
    for (let i = 0; i < tier.length; i++) {
      const node = tier[i];
      const y = centerY + (i - (tier.length - 1) / 2) * ROW_HEIGHT;
      positioned.set(node.id, {
        id: node.id,
        label: node.label,
        focal: node.focal,
        health: node.health,
        entityType: node.entityType,
        depth,
        x,
        y,
      });
    }
  }

  return {
    nodes: Array.from(positioned.values()),
    edges: edges.map((edge) => ({
      fromId: edge.from,
      toId: edge.to,
      emphasized: edge.emphasized,
    })),
    width,
    height,
  };
};
