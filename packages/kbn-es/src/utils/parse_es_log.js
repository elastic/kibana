/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const chalk = require('chalk');

/**
 * @param {String} data
 * @returns {Array} lines
 */
exports.parseEsLog = function parseEsLog(data) {
  const lines = [];
  const regex = /\[([0-9-T:,]+)\]\[([A-Z]+)\s?\]\[([A-Za-z0-9.]+)\s*\]\s?([\S\s]+?(?=$|\n\[))/g;
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
    const [, , level, location, message] = capture;
    const color = colorForLevel(level);

    lines.push({
      formattedMessage: `[${chalk.dim(location)}] ${color(message.trim())}`,
      message: `[${location}] ${message.trim()}`,
      level: level.toLowerCase(),
    });

    capture = regex.exec(data);
  } while (capture);
  return lines;
};

function colorForLevel(level) {
  switch (level) {
    case 'WARN':
      return chalk.yellow;
    case 'DEBUG':
      return chalk.dim;
  }

  return chalk.reset;
}
