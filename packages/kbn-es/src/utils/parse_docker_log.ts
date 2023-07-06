/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { colorForLevel } from './parse_es_log';

export function parseDockerLog(data: string) {
  const lines = [];
  const regex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}(?:\r?\n|$)/g;

  let capture = regex.exec(data);

  if (!capture) {
    return [
      {
        formattedMessage: data.trim(),
        message: data.trim(),
        level: 'warn',
      },
    ];
  }

  do {
    try {
      const log = JSON.parse(capture.at(0) ?? '{}');
      const { 'log.level': level, message, 'service.name': service } = log;
      const color = colorForLevel(level);

      lines.push({
        formattedMessage: `[${chalk.dim(service)}] ${color(message.trim())}`,
        message: `[${service}] ${message.trim()}`,
        level: level.toLowerCase(),
      });
    } catch (error) {
      // console.error(error, data);
    }

    capture = regex.exec(data);
  } while (capture);

  return lines;
}
