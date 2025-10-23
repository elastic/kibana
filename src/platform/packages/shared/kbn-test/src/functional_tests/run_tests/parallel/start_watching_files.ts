/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// startWatchingDirectories.ts
// Requires: npm i chokidar
// If your tsconfig doesn't enable esModuleInterop, change the import to: import * as chokidar from "chokidar";

import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import type { Stats } from 'node:fs';
import * as path from 'node:path';

export interface WatchedDirectoryEntry {
  /** Absolute or project-relative path to the directory to watch */
  dir: string;
  /** Max number of relative path segments to keep in the change set */
  depth: number; // depth >= 1
}

export type WatchedDirectoryConfig = WatchedDirectoryEntry[];

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  isLeaf: boolean; // true means this node is a truncated endpoint (file-or-folder placeholder)
}

interface InternalWatcher {
  baseDir: string; // normalized absolute path
  depth: number;
  watcher: FSWatcher;
  changes: Set<string>; // truncated relative paths (posix-style)
  isReady: boolean;
}

export function startWatchingFiles({
  directories,
  maxChildrenPerDir = 20,
}: {
  directories: WatchedDirectoryConfig;
  maxChildrenPerDir?: number;
}): {
  unsubscribe: () => void;
  getFormattedFileChanges: () => string;
} {
  if (!Array.isArray(directories) || directories.length === 0) {
    throw new Error('directories must be a non-empty array');
  }

  if (!Number.isInteger(maxChildrenPerDir) || maxChildrenPerDir < 1) {
    throw new Error('maxChildrenPerDir must be a positive integer');
  }

  // Normalize and instantiate one chokidar watcher per directory so each can have its own depth.
  const watchers: InternalWatcher[] = directories.map(({ dir, depth }) => {
    if (!dir) throw new Error("Each config entry must include a 'dir' path.");
    if (typeof depth !== 'number' || depth < 1) {
      throw new Error(`Depth must be a positive integer for directory: ${dir}`);
    }

    const absBase = path.resolve(dir);

    // chokidar depth controls how deep it *emits* events.
    const watcher = chokidar.watch(absBase, {
      ignoreInitial: true,
      persistent: true,
      // Respect per-base depth. chokidar's depth is "levels under the dir".
      // If depth=1, we still want to see top-level items, so set depth-1 for chokidar.
      depth: Math.max(depth - 1, 0),
      // Reasonable defaults; tweak as needed
      awaitWriteFinish: false,
      ignored: ['**/.git/**', '**/*.d.ts', '**/*.map'],
      followSymlinks: false,
      ignorePermissionErrors: true,
    });

    return {
      baseDir: absBase,
      depth,
      watcher,
      changes: new Set<string>(),
      isReady: false,
    };
  });

  // Subscribe to file-change-like events. You can extend to dir events if needed.
  const eventNames = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];

  for (const w of watchers) {
    w.watcher.on('ready', () => {
      w.changes.clear();
      w.isReady = true;
    });

    for (const evt of eventNames) {
      w.watcher.on(evt, (changedPath: string, stats?: Stats) => {
        if (!w.isReady) {
          return;
        }

        if (changedPath.includes('.backportrc.json')) {
          console.log(evt, changedPath, stats);
        }

        // Only consider paths under this base; chokidar guarantees it, but be defensive.
        const rel = toPosixRelative(w.baseDir, changedPath);
        if (rel == null || rel.length === 0) return;

        const truncated = truncateSegments(rel, w.depth);
        // Avoid recording the base dir itself; require at least one segment
        if (truncated.length > 0) {
          w.changes.add(truncated);
        }
      });
    }
  }

  function unsubscribe() {
    for (const w of watchers) {
      w.isReady = false;
      w.watcher.close().catch(() => {
        /* ignore */
      });
    }
  }

  function getFormattedFileChanges(): string {
    // Build a forest of trees: one root per watched base directory.
    // Each root displays the baseDir (as provided) and the truncated change paths within it.
    const lines: string[] = [];

    for (const w of watchers) {
      const title = formatRootTitle(w.baseDir);
      const treeRoot: TreeNode = { name: title, children: new Map(), isLeaf: false };

      // Insert truncated relative paths into the tree
      const sortedRelPaths = Array.from(w.changes).sort(comparePathStrings);
      for (const rel of sortedRelPaths) {
        insertIntoTree(treeRoot, rel);
      }

      // Render the tree (skip the root name inside the tree render; print it separately)
      lines.push(title);
      if (w.changes.size === 0) {
        lines.push('  (no changes yet)');
      } else {
        const sortedChildren: TreeNode[] = Array.from(treeRoot.children.entries())
          .sort(([leftName], [rightName]) => comparePathStrings(leftName, rightName))
          .map(([, childNode]) => childNode);

        const hasHiddenChildren = sortedChildren.length > maxChildrenPerDir;
        const visibleChildren = hasHiddenChildren
          ? sortedChildren.slice(0, maxChildrenPerDir)
          : sortedChildren;

        for (let i = 0; i < visibleChildren.length; i++) {
          const childNode = visibleChildren[i];
          const isLastVisibleChild = !hasHiddenChildren && i === visibleChildren.length - 1;
          renderTree({
            node: childNode,
            prefix: '',
            isLast: isLastVisibleChild,
            output: lines,
            maxChildrenPerDir,
          });
        }

        if (hasHiddenChildren) {
          const hiddenCount = sortedChildren.length - maxChildrenPerDir;
          lines.push(`└── ${formatHiddenChildrenSummary(hiddenCount)}`);
        }
      }

      // Extra newline between directory sections
      lines.push('');
    }

    // Remove the final extra newline for neatness
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    return lines.join('\n');
  }

  return { unsubscribe, getFormattedFileChanges };
}

/* ------------------------ helpers ------------------------ */

function toPosixRelative(baseDirAbs: string, changedAbs: string): string | null {
  const rel = path.relative(baseDirAbs, changedAbs);
  if (rel.startsWith('..')) return null;
  // Normalize to POSIX-style separators for stable sets/formatting
  return rel.split(path.sep).join('/');
}

/**
 * Truncate a posix-style relative path to the first `depth` segments.
 * Example: truncateSegments("a/b/c/d.txt", 2) => "a/b"
 */
function truncateSegments(posixRelPath: string, depth: number): string {
  const segments = posixRelPath.split('/').filter(Boolean);
  return segments.slice(0, depth).join('/');
}

/** Consistent title: show the directory basename and the full path */
function formatRootTitle(absBase: string): string {
  const baseName = path.basename(absBase);
  return `${baseName} (${absBase})`;
}

function insertIntoTree(root: TreeNode, posixRelPath: string) {
  const parts = posixRelPath.split('/').filter(Boolean);
  let cursor = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    let child = cursor.children.get(part);
    if (!child) {
      child = { name: part, children: new Map(), isLeaf: false };
      cursor.children.set(part, child);
    }
    cursor = child;
  }
  cursor.isLeaf = true; // mark truncated endpoint
}

/**
 * Tree printing similar to `tree` CLI:
 * Uses "├──", "└──", "│  ", "   " connectors.
 */
interface RenderTreeParams {
  node: TreeNode;
  prefix: string;
  isLast: boolean;
  output: string[];
  maxChildrenPerDir: number;
}

function renderTree({ node, prefix, isLast, output, maxChildrenPerDir }: RenderTreeParams) {
  const connector = isLast ? '└── ' : '├── ';
  output.push(prefix + connector + node.name);

  const sortedChildren: TreeNode[] = Array.from(node.children.entries())
    .sort(([leftName], [rightName]) => comparePathStrings(leftName, rightName))
    .map(([, childNode]) => childNode);

  if (sortedChildren.length === 0) {
    return;
  }

  const nextPrefix = prefix + (isLast ? '    ' : '│   ');
  const hasHiddenChildren = sortedChildren.length > maxChildrenPerDir;
  const visibleChildren = hasHiddenChildren
    ? sortedChildren.slice(0, maxChildrenPerDir)
    : sortedChildren;

  for (let i = 0; i < visibleChildren.length; i++) {
    const childNode = visibleChildren[i];
    const isLastVisibleChild = !hasHiddenChildren && i === visibleChildren.length - 1;
    renderTree({
      node: childNode,
      prefix: nextPrefix,
      isLast: isLastVisibleChild,
      output,
      maxChildrenPerDir,
    });
  }

  if (hasHiddenChildren) {
    const hiddenCount = sortedChildren.length - maxChildrenPerDir;
    output.push(`${nextPrefix}└── ${formatHiddenChildrenSummary(hiddenCount)}`);
  }
}

function formatHiddenChildrenSummary(hiddenCount: number): string {
  return `... (${hiddenCount} more)`;
}

function comparePathStrings(a: string, b: string): number {
  // Sort directories/files lexicographically, case-insensitive, but stable.
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
