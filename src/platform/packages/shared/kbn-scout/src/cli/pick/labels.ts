/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import type { ScoutTestTarget } from '@kbn/scout-info';
import type { PinnedConfig } from './pins';

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Dims the parts of a config path that all configs share */
const highlightPath = (path: string) =>
  path
    .split('/')
    .map((part) => {
      if (part === 'test' || part === 'scout' || part === 'playwright.config.ts') {
        return chalk.dim(part);
      }
      if (part === 'parallel.playwright.config.ts') {
        return `${chalk.bold('parallel')}${chalk.dim('.playwright.config.ts')}`;
      }
      return chalk.bold(part);
    })
    .join(chalk.dim('/'));

export const formatConfig = ({ module, file }: PinnedConfig, withModule = true) =>
  withModule ? `${module} ${chalk.dim('·')} ${highlightPath(file)}` : highlightPath(file);

export const describeServerSet = (configSet: string) =>
  configSet === 'default' ? 'default servers' : `custom servers: ${configSet}`;

export const describeTarget = ({ arch, domain }: { arch?: string; domain?: string }) =>
  `${arch} · ${domain}`;

export const describeRun = ({
  config,
  specs,
  target,
}: {
  config: PinnedConfig;
  specs: string[];
  target: ScoutTestTarget;
}) =>
  `${config.module} · ${config.file} · ${
    specs.length ? plural(specs.length, 'spec') : 'all specs'
  } · ${describeTarget(target)}`;
