/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';

function colorForLevel(level: string) {
  switch (level) {
    case 'WARN':
      return chalk.yellow;
    case 'DEBUG':
      return chalk.dim;
  }

  return chalk.reset;
}

function parseLog(
  data: string,
  regex: RegExp,
  extractFn: (capture: RegExpExecArray) => Record<string, any>
) {
  const lines = [];
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
    const { level, location, message } = extractFn(capture);
    const color = colorForLevel(level);

    lines.push({
      formattedMessage: `[${chalk.dim(location)}] ${color(message.trim())}`,
      message: `[${location}] ${message.trim()}`,
      level: level.toLowerCase(),
    });

    capture = regex.exec(data);
  } while (capture);

  return lines;
}

function extractEsLog(capture: RegExpExecArray) {
  const [, , level, location, message] = capture;

  return { level, location, message };
}

/**
 * extract useful info about an es log line
 */
export function parseEsLog(data: string) {
  const regex = /\[([0-9-T:,]+)\]\[([A-Z]+)\s?\]\[([A-Za-z0-9.]+)\s*\]\s?([\S\s]+?(?=$|\n\[))/g;

  return parseLog(data, regex, extractEsLog);
}

function extractDockerLog(capture: RegExpExecArray) {
  const [jsonStringLog] = capture;
  const log = JSON.parse(jsonStringLog);
  const { 'log.level': level, message, 'service.name': location } = log;

  return { level, location, message };
}

/**
 * extract info from json docker es log
 */
export function parseEsDockerLog(data: string) {
  const regex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}(?:\r?\n|$)/g;

  return parseLog(data, regex, extractDockerLog);
}
