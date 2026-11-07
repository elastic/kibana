/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlProfilePlan } from '@kbn/es-types';
import type { QueryProfileView, TimelineDriver, TimelineOperator } from './aggregate_esql_profile';

const MAX_DETAIL_LENGTH = 280;
/** How many operators ahead a plan node may look for its own, before it is taken to have none. */
const MAX_OPERATOR_LOOKAHEAD = 2;

/** A node of the physical plan as ES prints it, before any time is attached. */
export interface RawPlanNode {
  name: string;
  /** Everything printed after the name, including lines the printer wrapped. */
  details: string;
  children: RawPlanNode[];
}

export interface PlanNode {
  id: string;
  /** The class name of the node, such as AggregateExec. */
  name: string;
  /** A short label for a box, such as Aggregate · INITIAL. */
  label: string;
  /** What the plan printed for the node, cleaned of ids, for a tooltip. */
  detail: string;
  children: PlanNode[];
  /** True when an operator of the profile was matched to this node. */
  hasOperator: boolean;
  /** CPU time of the operator that was matched to this node. */
  selfNanos: number;
  /** CPU time of this node and of everything that feeds it. */
  inclusiveNanos: number;
  rowsIn: number;
  rowsOut: number;
}

export interface PlanTree {
  root: PlanNode;
  /** CPU time of every node, which the whole tree adds up to. */
  totalNanos: number;
}

interface Operator {
  title: string;
  nanos: number;
  timeReported: boolean;
  rowsIn: number;
  rowsOut: number;
}

/**
 * Reads the indented text ES prints for a physical plan. Each node starts with its name, and a child
 * is marked with `\_` and two more spaces than its parent. The printer wraps long lines, so a line
 * that is not a node belongs to the node before it.
 */
export function parsePlanText(text: string): RawPlanNode | undefined {
  const stack: Array<{ depth: number; node: RawPlanNode }> = [];
  let root: RawPlanNode | undefined;

  text.split('\n').forEach((line) => {
    const child = /^( *)\\_([A-Za-z][A-Za-z0-9]*)(.*)$/.exec(line);
    const rootLine = !root && !child ? /^([A-Za-z][A-Za-z0-9]*)(.*)$/.exec(line) : undefined;

    if (rootLine) {
      root = { name: rootLine[1], details: rootLine[2], children: [] };
      stack.push({ depth: 0, node: root });
      return;
    }
    if (child) {
      const depth = child[1].length / 2 + 1;
      const node: RawPlanNode = { name: child[2], details: child[3], children: [] };
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }
      stack[stack.length - 1]?.node.children.push(node);
      stack.push({ depth, node });
      return;
    }
    const current = stack[stack.length - 1]?.node;
    if (current) {
      current.details += line.trim();
    }
  });

  return root;
}

/** Attribute ids and type markers say nothing to a reader, so they are left out of the detail. */
const cleanDetail = (details: string): string => {
  const cleaned = details
    .replace(/#\d+/g, '')
    .replace(/\{[a-z$]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > MAX_DETAIL_LENGTH ? `${cleaned.slice(0, MAX_DETAIL_LENGTH)}…` : cleaned;
};

const shortName = (name: string): string => name.replace(/Exec$/, '');

function labelFor(name: string, details: string): string {
  const mode = /\b(INITIAL|INTERMEDIATE|FINAL|SINGLE)\b/.exec(details)?.[1];
  if (mode) {
    return `${shortName(name)} · ${mode}`;
  }
  const source = /^\[([^\]\s,]+)\]/.exec(details)?.[1];
  return name === 'EsQueryExec' && source ? `${shortName(name)} ${source}` : shortName(name);
}

/** Whether an operator of the profile is the one a plan node runs as. */
function matches(nodeName: string, operatorTitle: string): boolean {
  const node = nodeName.replace(/Exec$/, '').toLowerCase();
  const operator = operatorTitle.toLowerCase();

  if (node === 'esquery') {
    return operator.includes('lucene');
  }
  if (node === 'fieldextract') {
    return operator.includes('reader');
  }
  if (node === 'aggregate') {
    return operator.includes('aggregation');
  }
  return operator.includes(node) || node.includes(operator);
}

const flatten = (node: RawPlanNode): RawPlanNode[] => [
  node,
  ...node.children.flatMap((child) => flatten(child)),
];

/**
 * Gives each node of a plan the operator that ran it. Operators run from the source to the sink,
 * and a plan is printed from the sink to the source, so they are walked in opposite directions and
 * matched by kind. A node whose kind does not turn up in the next few operators has none, as when
 * a filter was pushed into the search.
 */
function attachOperators(root: RawPlanNode, operators: Operator[]): Map<RawPlanNode, Operator> {
  const matched = new Map<RawPlanNode, Operator>();
  const walked = [...operators].reverse();
  let next = 0;

  flatten(root).forEach((node) => {
    const limit = Math.min(walked.length, next + MAX_OPERATOR_LOOKAHEAD + 1);
    for (let index = next; index < limit; index++) {
      if (matches(node.name, walked[index].title)) {
        matched.set(node, walked[index]);
        next = index + 1;
        return;
      }
    }
  });
  return matched;
}

/** Operators in the same stage run in parallel on drivers of the same shape, so they line up. */
function mergeOperators(drivers: TimelineDriver[]): Operator[] {
  const merged: Operator[] = [];
  drivers.forEach((driver) =>
    driver.operators.forEach((operator: TimelineOperator, position) => {
      const current = merged[position] ?? {
        title: operator.title,
        nanos: 0,
        timeReported: false,
        rowsIn: 0,
        rowsOut: 0,
      };
      current.nanos += operator.processNanos;
      current.timeReported = current.timeReported || operator.timeReported;
      current.rowsIn += operator.rowsReceived;
      current.rowsOut += operator.rowsEmitted;
      merged[position] = current;
    })
  );
  return merged;
}

/**
 * The same plan is printed once for each node it ran on, and the printer wraps long lines in the
 * middle of an id, so the text of two copies differs. What does not differ is the shape of the plan.
 */
const structureOf = (node: RawPlanNode): string =>
  `${node.name}${
    /\b(INITIAL|INTERMEDIATE|FINAL|SINGLE)\b/.exec(node.details)?.[1] ?? ''
  }(${node.children.map(structureOf).join(',')})`;

const signature = (plan: EsqlProfilePlan): string => {
  const raw = plan.plan ? parsePlanText(plan.plan) : undefined;
  return raw ? structureOf(raw) : '';
};

interface Stage {
  description: string;
  root: PlanNode;
}

const findExchangeSource = (node: PlanNode): PlanNode | undefined =>
  node.name === 'ExchangeSourceExec'
    ? node
    : node.children.reduce<PlanNode | undefined>(
        (found, child) => found ?? findExchangeSource(child),
        undefined
      );

/**
 * Builds the plan of a query as a tree with the CPU time of each node, from what the profile says
 * about the plans and the operators. The plan of each stage is joined to the stage that reads its
 * output, at its exchange. Operators are matched to nodes by kind and order, so it is a best effort.
 */
export function buildPlanTree(view: QueryProfileView): PlanTree | undefined {
  const drivers = view.timeline.drivers;
  const nonData = drivers.filter((driver) => driver.description !== 'data');
  let counter = 0;

  const toNode = (raw: RawPlanNode, operators: Map<RawPlanNode, Operator>): PlanNode => {
    const operator = operators.get(raw);
    counter += 1;
    return {
      id: `plan-${counter}`,
      name: raw.name,
      label: labelFor(raw.name, raw.details),
      detail: cleanDetail(raw.details),
      children: raw.children.map((child) => toNode(child, operators)),
      hasOperator: operator !== undefined,
      selfNanos: operator?.timeReported ? operator.nanos : 0,
      // Worked out once the stages are joined, since joining adds to what feeds a node.
      inclusiveNanos: 0,
      rowsIn: operator?.rowsIn ?? 0,
      rowsOut: operator?.rowsOut ?? 0,
    };
  };

  const build = (plan: EsqlProfilePlan, stageDrivers: TimelineDriver[]): PlanNode | undefined => {
    const raw = plan.plan ? parsePlanText(plan.plan) : undefined;
    return raw ? toNode(raw, attachOperators(raw, mergeOperators(stageDrivers))) : undefined;
  };

  // Plans come in the order of the drivers: the data plans of a stage, then the plan that reads them.
  const stages: Stage[] = [];
  let feeders: EsqlProfilePlan[] = [];
  view.plans.forEach((plan) => {
    const description = plan.description ?? '';
    if (description === 'data') {
      feeders.push(plan);
      return;
    }

    const stageDrivers = nonData.filter((driver) => driver.description === description);
    const root = build(plan, stageDrivers);
    if (!root) {
      feeders = [];
      return;
    }

    const unique = [...new Map(feeders.map((feeder) => [signature(feeder), feeder])).values()];
    const feeding = drivers.filter((driver) => {
      if (driver.description !== 'data') {
        return false;
      }
      const next = nonData.find((candidate) => Number(candidate.id) > Number(driver.id));
      return next !== undefined && next.description === description;
    });
    const feedingNodes = unique.flatMap((feeder) => build(feeder, feeding) ?? []);

    const exchange = findExchangeSource(root);
    if (exchange && feedingNodes.length > 0) {
      exchange.children.push(...feedingNodes);
    } else if (feedingNodes.length > 0) {
      root.children.push(...feedingNodes);
    }
    stages.push({ description, root });
    feeders = [];
  });

  // A profile with only data plans has no stage to read them, so they stand on their own.
  if (stages.length === 0) {
    const only = feeders[0] && build(feeders[0], drivers);
    return only ? finalize(only) : undefined;
  }

  const rootStage =
    stages.find((stage) => stage.description === 'main.final') ?? stages[stages.length - 1];
  const subplanIndex = (stage: Stage): number =>
    Number(/^subplan-(\d+)/.exec(stage.description)?.[1] ?? Infinity);
  // Subqueries are joined in the order they are written, whatever order they finished in.
  [...stages]
    .map((stage, index) => ({ stage, index }))
    .sort((left, right) => subplanIndex(left.stage) - subplanIndex(right.stage))
    .forEach(({ stage, index }) => {
      if (stage === rootStage) {
        return;
      }
      const parent = stage.description.startsWith('subplan-') ? rootStage : stages[index + 1];
      const exchange = parent && findExchangeSource(parent.root);
      (exchange ?? parent?.root)?.children.push(stage.root);
    });

  return finalize(rootStage.root);
}

function sumInclusive(node: PlanNode): number {
  node.inclusiveNanos =
    node.selfNanos + node.children.reduce((sum, child) => sum + sumInclusive(child), 0);
  return node.inclusiveNanos;
}

function finalize(root: PlanNode): PlanTree | undefined {
  sumInclusive(root);
  return root.inclusiveNanos > 0 ? { root, totalNanos: root.inclusiveNanos } : undefined;
}
