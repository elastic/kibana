/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Readline from 'readline';
import { stripVTControlCharacters } from 'util';
import chalk from 'chalk';
import { createFailError } from '@kbn/dev-cli-errors';

export interface Choice<T> {
  /** May be colored, filtering uses the plain text */
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

/** Thrown when the user presses Esc to go back to the previous question */
export class GoBack extends Error {}

let shownPrompts = 0;
export const getShownPrompts = () => shownPrompts;

/**
 * The questions answered so far, so each prompt can name the one Esc goes back to. Only
 * answered prompts count: a question skipped because it had a single answer, or one left by
 * pressing Esc, is not somewhere Esc can return to.
 */
const answered: string[] = [];

/** Called when Esc goes back to the last question, which is about to be asked again */
export const forgetAnswer = () => {
  answered.pop();
};

/** Called when the questions start over, so Esc stops naming one of the old ones */
export const forgetAnswers = () => {
  answered.length = 0;
};

const plain = stripVTControlCharacters;

const matches = ({ label, hint }: Choice<unknown>, query: string) => {
  const text = plain(`${label} ${hint ?? ''}`).toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
};

/** Colors are dropped when the text has to be cut */
const truncate = (text: string, width: number) => {
  const visible = plain(text);
  return visible.length > width ? `${visible.slice(0, Math.max(width - 1, 0))}…` : text;
};

const printAnswer = (message: string, picked: Array<Choice<unknown>>) => {
  const answer =
    picked.length > 3
      ? `${picked.length} selected`
      : picked.map(({ label }) => plain(label)).join(', ');
  process.stdout.write(`${chalk.green('✔')} ${chalk.bold(message)} ${chalk.cyan(answer)}\n`);
};

/** A list that filters as you type, resolving with one value or with the selected ones */
const prompt = <T>({ message, choices, multiple = false }: PromptOptions<T>): Promise<T[]> => {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    throw createFailError('scout pick needs an interactive terminal');
  }

  shownPrompts++;
  const back = answered[answered.length - 1];
  const escHint = back ? `esc back to ${plain(back).replace(/\?$/, '')}` : 'esc back';
  return new Promise((resolve, reject) => {
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
      const columns = stdout.columns || 100;
      const width = columns - (multiple ? 8 : 6);
      const page = visible.slice(start, start + PAGE_SIZE);
      // hints line up in one column; labels are cut first, down to half of the width
      const hintWidth = Math.max(0, ...page.map(({ hint }) => plain(hint ?? '').length));
      const labelWidth = Math.min(
        Math.max(0, ...page.map(({ label }) => plain(label).length)),
        Math.max(width - hintWidth - 2, Math.floor(width / 2))
      );

      const lines = [
        `${chalk.cyan('?')} ${chalk.bold(message)} ${query || chalk.dim('type to filter')}`,
        ...page.map((choice, index) => {
          const isCurrent = start + index === cursor;
          const box = multiple ? `${selected.has(choice) ? chalk.green('◉') : '◯'} ` : '';
          const label = truncate(choice.label, choice.hint ? labelWidth : width);
          const hint = choice.hint ? truncate(choice.hint, width - labelWidth - 2) : '';
          return `${isCurrent ? chalk.cyan('❯') : ' '} ${box}${
            isCurrent ? chalk.cyan(label) : label
          }${hint ? `${' '.repeat(labelWidth - plain(label).length)}  ${chalk.dim(hint)}` : ''}`;
        }),
        ...(visible.length ? [] : [chalk.dim('  no matches')]),
        ...(visible.length > start + PAGE_SIZE
          ? [chalk.dim(`  … ${visible.length - start - PAGE_SIZE} more`)]
          : []),
        chalk.dim(
          multiple
            ? `  ↑↓ move · space select · ctrl+a select all · enter confirm · ${escHint}`
            : `  ↑↓ move · enter select · ${escHint}`
        ),
      ];

      clear();
      // a line that wraps counts twice on screen but once here, which would break clear()
      stdout.write(lines.map((line) => truncate(line, columns)).join('\n'));
      renderedLines = lines.length;
    };

    const close = () => {
      stdin.off('keypress', onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      clear();
      stdout.write('\x1b[?25h');
    };

    const finish = (picked: Array<Choice<T>>) => {
      close();
      answered.push(message);
      printAnswer(message, picked);
      resolve(picked.map(({ value }) => value));
    };

    const onKeypress = (text: string | undefined, key: Readline.Key) => {
      const visible = filtered();
      const current = visible[cursor];

      if (key.ctrl && key.name === 'c') {
        close();
        process.exit(130);
      } else if (key.name === 'escape') {
        close();
        reject(new GoBack());
        return;
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

/** A single choice is picked without asking, but still shown */
export const select = async <T>(message: string, choices: Array<Choice<T>>): Promise<T> => {
  if (choices.length === 1) {
    printAnswer(message, choices);
    return choices[0].value;
  }
  const [value] = await prompt({ message, choices });
  return value;
};

export const multiSelect = <T>(message: string, choices: Array<Choice<T>>): Promise<T[]> =>
  prompt({ message, choices, multiple: true });

/** Resolves with `value` instead of rejecting when Esc is pressed */
export const onBack = <T, U>(promise: Promise<T>, value: U): Promise<T | U> =>
  promise.catch((error) => {
    if (error instanceof GoBack) {
      return value;
    }
    throw error;
  });
