/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Readline from 'readline';
import chalk from 'chalk';
import { createFailError } from '@kbn/dev-cli-errors';

export interface Choice<T> {
  label: string;
  value: T;
  hint?: string;
  checked?: boolean;
}

interface PromptOptions<T> {
  message: string;
  choices: Array<Choice<T>>;
  multiple?: boolean;
}

const PAGE_SIZE = 12;

const matches = ({ label, hint }: Choice<unknown>, query: string) => {
  const text = `${label} ${hint ?? ''}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
};

const truncate = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, Math.max(width - 1, 0))}…` : text;

/** A list that filters as you type, resolving with one value or with the selected ones */
const prompt = <T>({ message, choices, multiple = false }: PromptOptions<T>): Promise<T[]> => {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    throw createFailError('scout pick needs an interactive terminal');
  }

  return new Promise((resolve) => {
    let query = '';
    let cursor = 0;
    let renderedLines = 0;
    const selected = new Set(choices.filter(({ checked }) => checked));
    // with preselected choices, unselecting all of them is a valid answer
    const allowEmpty = selected.size > 0;
    const filtered = () => choices.filter((choice) => matches(choice, query));

    const clear = () => {
      if (renderedLines) {
        Readline.moveCursor(stdout, 0, -(renderedLines - 1));
        Readline.cursorTo(stdout, 0);
        Readline.clearScreenDown(stdout);
      }
    };

    const render = () => {
      const visible = filtered();
      cursor = Math.min(cursor, Math.max(visible.length - 1, 0));
      const start = Math.max(0, cursor - PAGE_SIZE + 1);
      const width = (stdout.columns || 100) - 6;

      const lines = [
        `${chalk.cyan('?')} ${chalk.bold(message)} ${query || chalk.dim('type to filter')}`,
        ...visible.slice(start, start + PAGE_SIZE).map((choice, index) => {
          const isCurrent = start + index === cursor;
          const box = multiple ? `${selected.has(choice) ? chalk.green('◉') : '◯'} ` : '';
          const label = truncate(choice.label, width - 2);
          const hint = choice.hint ? truncate(choice.hint, width - label.length - 4) : '';
          return `${isCurrent ? chalk.cyan('❯') : ' '} ${box}${
            isCurrent ? chalk.cyan(label) : label
          }${hint ? `  ${chalk.dim(hint)}` : ''}`;
        }),
        ...(visible.length ? [] : [chalk.dim('  no matches')]),
        ...(visible.length > start + PAGE_SIZE
          ? [chalk.dim(`  … ${visible.length - start - PAGE_SIZE} more`)]
          : []),
        chalk.dim(
          multiple
            ? '  ↑↓ move · space select · ctrl+a select all · enter confirm'
            : '  ↑↓ move · enter select'
        ),
      ];

      clear();
      stdout.write(lines.join('\n'));
      renderedLines = lines.length;
    };

    const finish = (picked: Array<Choice<T>>) => {
      stdin.off('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      clear();
      const answer =
        picked.length > 3
          ? `${picked.length} selected`
          : picked.map(({ label }) => label).join(', ');
      stdout.write(`${chalk.green('✔')} ${chalk.bold(message)} ${chalk.cyan(answer)}\n\x1b[?25h`);
      resolve(picked.map(({ value }) => value));
    };

    const onKeypress = (text: string | undefined, key: Readline.Key) => {
      const visible = filtered();
      const current = visible[cursor];

      if (key.ctrl && key.name === 'c') {
        clear();
        stdout.write('\x1b[?25h');
        process.exit(130);
      } else if (key.name === 'return') {
        const picked = multiple ? choices.filter((choice) => selected.has(choice)) : [];
        if (picked.length || (multiple && allowEmpty)) {
          finish(picked);
          return;
        }
        if (current) {
          finish([current]);
          return;
        }
      } else if (key.name === 'up' && visible.length) {
        cursor = (cursor - 1 + visible.length) % visible.length;
      } else if (key.name === 'down' && visible.length) {
        cursor = (cursor + 1) % visible.length;
      } else if (multiple && key.name === 'space' && current) {
        if (!selected.delete(current)) selected.add(current);
      } else if (multiple && key.ctrl && key.name === 'a') {
        const allSelected = visible.every((choice) => selected.has(choice));
        visible.forEach((choice) => (allSelected ? selected.delete(choice) : selected.add(choice)));
      } else if (key.name === 'backspace') {
        query = query.slice(0, -1);
        cursor = 0;
      } else if (text && !key.ctrl && !key.meta && text >= ' ') {
        query += text;
        cursor = 0;
      }
      render();
    };

    Readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', onKeypress);
    stdout.write('\x1b[?25l');
    render();
  });
};

export const select = async <T>(message: string, choices: Array<Choice<T>>): Promise<T> => {
  const [value] = await prompt({ message, choices });
  return value;
};

export const multiSelect = <T>(message: string, choices: Array<Choice<T>>): Promise<T[]> =>
  prompt({ message, choices, multiple: true });
