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
