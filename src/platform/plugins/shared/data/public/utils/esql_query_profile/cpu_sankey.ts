/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView } from './aggregate_esql_profile';
import { operatorCategory } from './operator_icon';
import type { OperatorCategory } from './operator_icon';
import { formatCount } from './query_profile_format';

/** Past this many drivers, the quietest ones of each node are folded into one. */
const MAX_DRIVERS = 12;
const UNKNOWN_NODE = 'cluster';

export type SankeyLayer = 0 | 1 | 2;

export interface SankeyNode {
  id: string;
  layer: SankeyLayer;
  label: string;
  /** CPU time in nanoseconds that passes through the node. */
  value: number;
  /** Lines for a tooltip. */
  details: string[];
  /** Set for operators, so they can be colored by the kind of work they do. */
  category?: OperatorCategory;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  category?: OperatorCategory;
}

export interface Sankey {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface DriverTotals {
  key: string;
  nodeName: string;
  label: string;
  details: string[];
  total: number;
  byOperator: Map<string, number>;
}

/** Sources report only what they emit and sinks only what they take in, so a zero is left out. */
const rowLines = (rows: { rowsIn: number; rowsOut: number } | undefined): string[] =>
  rows
    ? [
        ...(rows.rowsIn > 0 ? [`Rows in: ${formatCount(rows.rowsIn)}`] : []),
        ...(rows.rowsOut > 0 ? [`Rows out: ${formatCount(rows.rowsOut)}`] : []),
      ]
    : [];

const millis = (nanos: number): string => `${(nanos / 1e6).toFixed(nanos >= 1e7 ? 0 : 2)} ms`;

/**
 * Breaks the operator CPU time down by where it was spent: on which node, in which driver, and in
 * which kind of operator. Ribbons are as thick as the time they carry, and every level adds up to
 * the same total. Drivers beyond the busiest ones are folded together for each node.
 */
export function buildCpuSankey(view: QueryProfileView): Sankey | undefined {
  const counts = new Map<string, number>();
  const drivers = view.timeline.drivers.flatMap((driver, index): DriverTotals[] => {
    const byOperator = new Map<string, number>();
    driver.operators.forEach((operator) => {
      if (operator.timeReported && operator.processNanos > 0) {
        byOperator.set(
          operator.title,
          (byOperator.get(operator.title) ?? 0) + operator.processNanos
        );
      }
    });
    const total = [...byOperator.values()].reduce((sum, nanos) => sum + nanos, 0);
    if (total <= 0) {
      return [];
    }

    const kind = driver.description || 'driver';
    const position = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, position);
    return [
      {
        key: `driver-${index}`,
        nodeName: driver.nodeName ?? UNKNOWN_NODE,
        label: `${kind}_${position}`,
        details: [
          `Driver: ${kind}`,
          ...(driver.nodeName ? [`Node: ${driver.nodeName}`] : []),
          `Duration: ${millis(driver.stopMillis - driver.startMillis)}`,
          ...(driver.cpuNanos !== undefined ? [`CPU: ${millis(driver.cpuNanos)}`] : []),
          `Operator CPU: ${millis(total)}`,
        ],
        total,
        byOperator,
      },
    ];
  });

  if (drivers.length === 0) {
    return undefined;
  }

  const busiest = new Set(
    [...drivers]
      .sort((left, right) => right.total - left.total)
      .slice(0, MAX_DRIVERS)
      .map((driver) => driver.key)
  );

  // The quiet drivers of a node become one driver, so a long tail does not bury the busy ones.
  const folded = new Map<string, DriverTotals & { count: number }>();
  const shown: DriverTotals[] = [];
  drivers.forEach((driver) => {
    if (busiest.has(driver.key)) {
      shown.push(driver);
      return;
    }
    const key = `others-${driver.nodeName}`;
    const group = folded.get(key) ?? {
      key,
      nodeName: driver.nodeName,
      label: '',
      details: [],
      total: 0,
      byOperator: new Map<string, number>(),
      count: 0,
    };
    group.total += driver.total;
    group.count += 1;
    driver.byOperator.forEach((nanos, title) =>
      group.byOperator.set(title, (group.byOperator.get(title) ?? 0) + nanos)
    );
    folded.set(key, group);
  });
  folded.forEach((group) => {
    shown.push({
      ...group,
      label: `${group.count} more`,
      details: [`${group.count} quieter drivers`, `Operator CPU: ${millis(group.total)}`],
    });
  });

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const operatorTotals = new Map<string, number>();
  const operatorRows = new Map<string, { rowsIn: number; rowsOut: number }>();
  const nodeTotals = new Map<string, number>();
  view.timeline.drivers.forEach((driver) =>
    driver.operators.forEach((operator) => {
      if (operator.timeReported && operator.processNanos > 0) {
        const rows = operatorRows.get(operator.title) ?? { rowsIn: 0, rowsOut: 0 };
        rows.rowsIn += operator.rowsReceived;
        rows.rowsOut += operator.rowsEmitted;
        operatorRows.set(operator.title, rows);
      }
    })
  );

  shown.forEach((driver) => {
    nodeTotals.set(driver.nodeName, (nodeTotals.get(driver.nodeName) ?? 0) + driver.total);
    nodes.push({
      id: driver.key,
      layer: 1,
      label: driver.label,
      value: driver.total,
      details: driver.details,
    });
    links.push({ source: `node-${driver.nodeName}`, target: driver.key, value: driver.total });
    driver.byOperator.forEach((nanos, title) => {
      operatorTotals.set(title, (operatorTotals.get(title) ?? 0) + nanos);
      links.push({
        source: driver.key,
        target: `operator-${title}`,
        value: nanos,
        category: operatorCategory(title),
      });
    });
  });

  nodeTotals.forEach((value, name) =>
    nodes.push({
      id: `node-${name}`,
      layer: 0,
      label: name,
      value,
      details: [`Node: ${name}`, `Operator CPU: ${millis(value)}`],
    })
  );
  operatorTotals.forEach((value, title) =>
    nodes.push({
      id: `operator-${title}`,
      layer: 2,
      label: title,
      value,
      details: [title, `Operator CPU: ${millis(value)}`, ...rowLines(operatorRows.get(title))],
      category: operatorCategory(title),
    })
  );

  return { nodes, links };
}

export interface PositionedNode extends SankeyNode {
  y: number;
  height: number;
}

export interface PositionedLink extends SankeyLink {
  /** Where the ribbon leaves its source, from the top of the chart. */
  sourceY: number;
  /** Where the ribbon reaches its target. */
  targetY: number;
  thickness: number;
}

export interface SankeyLayout {
  nodes: PositionedNode[];
  links: PositionedLink[];
  /** The height the layout needs. It is more than asked for when minimum heights add up. */
  height: number;
}

/**
 * Stacks the nodes of each layer, busiest first, and lays the ribbons into their nodes without
 * overlapping, ordered by where they go so they cross as little as possible.
 */
export function layoutSankey(
  sankey: Sankey,
  { height, padding, minHeight }: { height: number; padding: number; minHeight: number }
): SankeyLayout {
  const layers = [0, 1, 2].map((layer) =>
    sankey.nodes
      .filter((node) => node.layer === layer)
      .sort((left, right) => right.value - left.value)
  );
  const total = Math.max(
    1,
    ...layers.map((nodes) => nodes.reduce((sum, node) => sum + node.value, 0))
  );
  const mostNodes = Math.max(1, ...layers.map((nodes) => nodes.length));
  const scale = Math.max(0, (height - (mostNodes - 1) * padding) / total);

  const positioned = new Map<string, PositionedNode>();
  layers.forEach((nodes) => {
    let y = 0;
    nodes.forEach((node) => {
      const nodeHeight = Math.max(minHeight, node.value * scale);
      positioned.set(node.id, { ...node, y, height: nodeHeight });
      y += nodeHeight + padding;
    });
  });

  const yOf = (id: string): number => positioned.get(id)?.y ?? 0;

  const links = sankey.links.map(
    (link): PositionedLink => ({
      ...link,
      sourceY: 0,
      targetY: 0,
      thickness: Math.max(1, link.value * scale),
    })
  );

  positioned.forEach((node) => {
    let out = node.y;
    links
      .filter((link) => link.source === node.id)
      .sort((left, right) => yOf(left.target) - yOf(right.target))
      .forEach((link) => {
        link.sourceY = out;
        out += link.thickness;
      });

    let into = node.y;
    links
      .filter((link) => link.target === node.id)
      .sort((left, right) => yOf(left.source) - yOf(right.source))
      .forEach((link) => {
        link.targetY = into;
        into += link.thickness;
      });
  });

  const used = Math.max(0, ...[...positioned.values()].map((node) => node.y + node.height));
  return { nodes: [...positioned.values()], links, height: Math.max(height, used) };
}
