/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import execa from 'execa';

export const formatAge = (date: Date): string => {
  const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const getSize = async (path: string): Promise<number> => {
  const stats = await Fs.promises.lstat(path);
  if (!stats.isDirectory()) return stats.size;

  const entries = await Fs.promises.readdir(path);
  const sizes = await Promise.all(entries.map((entry) => getSize(Path.join(path, entry))));
  return sizes.reduce((total, size) => total + size, 0);
};

/** Returns stdout, or undefined when the command is missing or fails */
export const tryExec = async (file: string, args: string[]): Promise<string | undefined> => {
  try {
    const { stdout } = await execa(file, args);
    return stdout;
  } catch {
    return undefined;
  }
};

export const tildify = (path: string): string =>
  path.startsWith(Os.homedir()) ? `~${path.slice(Os.homedir().length)}` : path;

export const braces = (items: string[]): string =>
  items.length > 1 ? `{${items.join(',')}}` : items[0];

export const removePaths = async (paths: string[]) => {
  await Promise.all(paths.map((path) => Fs.promises.rm(path, { recursive: true, force: true })));
};

export const getScoutServerPids = async () => {
  const output = await tryExec('ps', ['-ax', '-o', 'pid=,command=']);
  return (output ?? '').split('\n').flatMap((line) => {
    const [pid, command, ...args] = line.trim().split(/\s+/);
    return /(^|\/)node$/.test(command) && args.join(' ').includes('scripts/scout start-server')
      ? [pid]
      : [];
  });
};

/** Ancestors of a pid, nearest first, so what holds a port can be traced back to what started it */
export const getAncestorPids = async (pid: string): Promise<string[]> => {
  const output = await tryExec('ps', ['-ax', '-o', 'pid=,ppid=']);
  const parents = new Map<string, string>();
  for (const line of (output ?? '').split('\n')) {
    const [child, parent] = line.trim().split(/\s+/);
    if (child && parent) parents.set(child, parent);
  }
  const ancestors: string[] = [];
  // launchd and the kernel are everyone's ancestors, so they say nothing about who started what
  for (
    let current = parents.get(pid);
    current && current !== '0' && current !== '1' && !ancestors.includes(current);
    current = parents.get(current)
  ) {
    ancestors.push(current);
  }
  return ancestors;
};

/** The directory a process was started in, so servers from another checkout can be named as such */
export const getProcessCwd = async (pid: string): Promise<string | undefined> => {
  const output = await tryExec('lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn']);
  return output
    ?.split('\n')
    .find((line) => line.startsWith('n'))
    ?.slice(1);
};
