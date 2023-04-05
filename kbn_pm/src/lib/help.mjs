/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COMMANDS, getCmd } from '../commands/index.mjs';
import { dedent, indent } from './indent.mjs';
import { title } from './colors.mjs';

/**
 * @param {string | undefined} cmdName
 * @returns {Promise<string>}
 */
export async function getHelp(cmdName = undefined) {
  const cmd = getCmd(cmdName);

  /**
   * @param {number} depth
   * @param {import('./command').Command} cmd
   * @returns {string[]}
   */
  const cmdLines = (depth, cmd) => {
    const intro = cmd.intro ? dedent(cmd.intro) : '';
    const desc = cmd.description ? dedent(cmd.description) : '';
    const flags = cmd.flagsHelp ? dedent(cmd.flagsHelp) : '';

    return [
      indent(
        depth,
        `${title(`yarn kbn ${cmd.name}${cmd.usage ? ` ${cmd.usage}` : ''}`)}${
          intro ? ` ${intro}` : ''
        }`
      ),
      '',
      ...(desc ? [indent(depth + 2, desc), ''] : []),
      ...(flags ? [indent(depth + 2, 'Flags:'), indent(depth + 4, flags), ''] : []),
    ];
  };

  if (cmd) {
    return ['', ...cmdLines(0, cmd)].join('\n');
  }

  return [
    'Usage:',
    '  yarn kbn <command> [...flags]',
    '',
    'Commands:',
    ...COMMANDS.flatMap((cmd) => (cmd.name.startsWith('_') ? [] : cmdLines(2, cmd))),
  ].join('\n');
}
