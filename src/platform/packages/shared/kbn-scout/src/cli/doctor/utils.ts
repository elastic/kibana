/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import execa from 'execa';
import { formatBytes } from '@kbn/es';

export { formatBytes };

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
