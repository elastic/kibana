/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
