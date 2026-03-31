/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { fromRoot } from '@kbn/repo-info';

function generateUrls({ version, plugin }) {
  return [
    plugin,
    `https://artifacts.elastic.co/downloads/kibana-plugins/${plugin}/${plugin}-${version}.zip`,
  ];
}

export function parseMilliseconds(val) {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const regex = /^(\d+)(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?|d|days?)?$/;
  const match = val.trim().match(regex);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  const unit = match[2] || 'ms';
  switch (unit) {
    case 'ms':
    case 'millisecond':
    case 'milliseconds':
      return num;
    case 's':
    case 'second':
    case 'seconds':
      return num * 1000;
    case 'm':
    case 'minute':
    case 'minutes':
      return num * 60 * 1000;
    case 'h':
    case 'hour':
    case 'hours':
      return num * 60 * 60 * 1000;
    case 'd':
    case 'day':
    case 'days':
      return num * 24 * 60 * 60 * 1000;
    default:
      return num;
  }
}

export function parse(command, options, kbnPackage) {
  const settings = {
    timeout: options.timeout || 0,
    quiet: options.quiet || false,
    silent: options.silent || false,
    config: options.config || '',
    plugin: command,
    version: kbnPackage.version,
    pluginDir: fromRoot('plugins'),
  };

  settings.urls = generateUrls(settings);
  settings.workingPath = resolve(settings.pluginDir, '.plugin.installing');
  settings.tempArchiveFile = resolve(settings.workingPath, 'archive.part');

  return settings;
}
