/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { createHook } from 'async_hooks';
import { compact, orderBy, repeat, sumBy, takeRight } from 'lodash';

// Holds information about each async resource
interface AsyncResourceInfo {
  id: number;
  type: string;
  depth: number;
  starts: number[];
  ends: number[];
  start: number;
  end: number;
  stack?: string[]; // only set if depth <= 2
  parentId: number; // who created this resource?
  metrics: Record<string, number>;
}

function truncate(values: string[]) {
  if (values.length <= 5) {
    return values;
  }
  return ['...', ...takeRight(values, 5)];
}

interface PrintableNode {
  type: string;
  indent: number;
  time: number;
  tasks: number;
  children: PrintableNode[];
  stack: string[];
}

const MAX_DEPTH = 30;

export function collectAsyncContextMetrics(): () => {
  print: () => string;
} {
  const asyncMap = new Map<number, AsyncResourceInfo>();

  const rootNodes: AsyncResourceInfo[] = [];

  function createAsyncResourceInfo(
    asyncId: number,
    parentId: number,
    type: string,
    depth: number
  ): AsyncResourceInfo {
    const info = {
      depth,
      id: asyncId,
      type,
      start: performance.now(),
      end: 0,
      starts: [],
      ends: [],
      stack: new Error().stack?.split('\n').slice(3, 23),
      parentId,
      metrics: {},
    };
    asyncMap.set(asyncId, info);

    return info;
  }

  const hook = createHook({
    init(asyncId, type, triggerAsyncId) {
      let parentInfo = asyncMap.get(triggerAsyncId);

      if (!parentInfo) {
        parentInfo = createAsyncResourceInfo(triggerAsyncId, -1, type, 0);
        rootNodes.push(parentInfo);
      }

      const depth = parentInfo.depth + 1;

      if (depth <= MAX_DEPTH) {
        createAsyncResourceInfo(asyncId, triggerAsyncId, type, depth);
      } else {
        asyncMap.set(asyncId, parentInfo);
      }

      // track count for type
      const resourceCount = parentInfo.metrics[type] ?? 0;
      parentInfo.metrics[type] = resourceCount + 1;
    },
    destroy(asyncId) {
      const info = asyncMap.get(asyncId);
      if (info && info.id === asyncId) {
        info.end = performance.now();
      }
    },
  });

  hook.enable();

  return () => {
    hook.disable();

    const infos = Array.from(new Set(asyncMap.values()).values());

    /**
     * Recursively prints a node, then its children in an indented form.
     *
     * @param node    The current AsyncResourceInfo to print
     * @param asyncMap All nodes, keyed by asyncId
     * @param indent  How deep we indent in the text output
     */

    const end = performance.now();
    function walk(node: AsyncResourceInfo, indent: number, parentFrames: string[]): PrintableNode {
      // Summation of all child metrics for this node. Or you can just use `node.metrics[node.type]`.
      // Here, we'll sum the values of node.metrics to get a single "task count".

      const totalTime = (node.end || end) - node.start;
      const ownTasks = Object.values(node.metrics).reduce((sum, val) => sum + val, 0);

      const allFrames = node.stack ?? [];

      const ownFrames: string[] = [];

      for (const frame of allFrames) {
        if (parentFrames.includes(frame)) {
          break;
        }
        ownFrames.push(frame.trim());
      }

      const children = infos
        .filter((child) => child.parentId === node.id)
        .map((child) => walk(child, indent + 1, allFrames));

      const childTasks = sumBy(children, (child) => child.tasks);

      return {
        type: node.type,
        time: totalTime,
        tasks: ownTasks + childTasks,
        indent,
        stack: ownFrames,
        children: orderBy(children, (child) => child.tasks, 'desc'),
      };
    }

    return {
      print: () => {
        const nodes = orderBy(
          rootNodes.map((root) => walk(root, 0, [])),
          (node) => node.tasks,
          'desc'
        );

        function format(node: PrintableNode): string[] {
          const prefix = repeat('\t', node.indent);

          const duration = node.time > 0 ? Math.round(node.time) : 0;

          return [
            ...compact([
              `${duration}ms ${node.type.toLowerCase()}, total ${node.tasks} child tasks`,
              ...truncate(node.stack.reverse()),
            ]).map((line, index) => (index === 0 ? `${prefix}${line}` : `${prefix} ${line}`)),
            ...node.children.flatMap((child) => format(child)),
          ];
        }

        const lines = nodes.flatMap((node) => {
          return format(node);
        });

        return JSON.stringify({
          lines: lines.join('\n'),
        });
      },
    };
  };
}
