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

import _ from 'lodash';

export default function help(command, spaces) {
  if (!_.size(command.commands)) {
    return command.outputHelp();
  }

  const defCmd = _.find(command.commands, function (cmd) {
    return cmd._name === 'serve';
  });

  const desc = !command.description() ? '' : command.description();
  const cmdDef = !defCmd ? '' : `=${defCmd._name}`;

  return `
Usage: ${command._name} [command${cmdDef}] [options]

${desc}

Commands:
${indent(commandsSummary(command), 2)}

${cmdHelp(defCmd)}
`
    .trim()
    .replace(/^/gm, spaces || '');
}

function indent(str, n) {
  return String(str || '')
    .trim()
    .replace(/^/gm, _.repeat(' ', n));
}

function commandsSummary(program) {
  const cmds = _.compact(
    program.commands.map(function (cmd) {
      const name = cmd._name;
      if (name === '*') return;
      const opts = cmd.options.length ? ' [options]' : '';
      const args = cmd._args
        .map(function (arg) {
          return humanReadableArgName(arg);
        })
        .join(' ');

      return [`${name} ${opts} ${args}`, cmd.description()];
    })
  );

  const cmdLColWidth = cmds.reduce(function (width, cmd) {
    return Math.max(width, cmd[0].length);
  }, 0);

  return cmds.reduce(function (help, cmd) {
    return `${help || ''}${_.padEnd(cmd[0], cmdLColWidth)} ${cmd[1] || ''}\n`;
  }, '');
}

function cmdHelp(cmd) {
  if (!cmd) return '';
  return `
"${cmd._name}" Options:

${indent(cmd.optionHelp(), 2)}
`.trim();
}

function humanReadableArgName(arg) {
  const nameOutput = arg.name + (arg.variadic === true ? '...' : '');
  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
}
