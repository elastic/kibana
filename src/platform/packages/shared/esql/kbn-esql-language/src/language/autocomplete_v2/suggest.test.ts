/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
// The package entry is loaded first: its modules have to be evaluated in the package's order.
import { suggest as currentSuggest } from '../../..';
import { esqlCommandRegistry } from '../../commands/registry';
import { suggest } from './suggest';

const textsAt = async (query: string, callbacks?: ESQLCallbacks): Promise<string[]> =>
  (await suggest(query, query.length, callbacks)).map(({ text }) => text);

const license = (level?: string): ESQLCallbacks => ({
  getLicense: async () => ({ hasAtLeast: (required) => required === level }),
});

const commandText = (name: string): string => `${name.toUpperCase()} `;

const licensed = esqlCommandRegistry
  .getAllCommands()
  .filter(({ metadata }) => metadata.license && !metadata.hidden && !metadata.type);
const timeSeriesOnly = esqlCommandRegistry
  .getAllCommands()
  .filter(({ metadata }) => metadata.requiresTimeseriesSource && !metadata.hidden);

describe('suggest (v2)', () => {
  describe('where nothing applies', () => {
    it.each(['FROM a // comment', 'FROM a | WHERE b == "text', 'FROM a | KEEP )'])(
      'suggests nothing at the end of %j',
      async (query) => {
        expect(await textsAt(query)).toEqual([]);
      }
    );
  });

  describe('command names', () => {
    it('offers the commands that can start a query', async () => {
      expect(await textsAt('')).toEqual(expect.arrayContaining(['FROM ', 'ROW ', 'SHOW ', 'TS ']));
    });

    it('offers after a pipe the same commands as the current flow', async () => {
      const callbacks = license('platinum');
      const current = (await currentSuggest('FROM a | ', 9, callbacks)).map(({ text }) => text);

      // The current flow leaves FORK out after a pipe only when a FORK is already there.
      expect((await textsAt('FROM a | ', callbacks)).sort()).toEqual(current.sort());
    });

    it('offers a command that starts in several ways once per way Kibana registered', async () => {
      const texts = await textsAt('FROM a | ');

      expect(texts.filter((text) => text.includes('JOIN'))).toEqual(['LOOKUP JOIN ']);
      expect(texts.filter((text) => text.startsWith('INLINE'))).toEqual(['INLINE STATS ']);
    });

    it('leaves out a command the grammar has and Kibana has not registered', async () => {
      expect(await textsAt('FROM a | ')).not.toContain('FILLNULL ');
    });

    it('offers no header command inside the pipeline', async () => {
      expect(await textsAt('FROM a | ')).not.toContain('SET ');
    });

    it('offers the commands of a branch where a branch starts', async () => {
      const texts = await textsAt('FROM a | FORK (');

      expect(texts).toEqual(expect.arrayContaining(['WHERE ', 'LIMIT ']));
      expect(texts).not.toContain('FROM ');
    });

    it('offers only the commands that can start a subquery inside one', async () => {
      expect((await textsAt('FROM a, (')).sort()).toEqual(
        esqlCommandRegistry
          .getAllCommands()
          .filter(({ metadata }) => metadata.subquerySource && !metadata.hidden)
          .map(({ name }) => commandText(name))
          .sort()
      );
    });
  });

  describe('gates', () => {
    it('has commands to check each gate with', () => {
      expect(licensed.length).toBeGreaterThan(0);
      expect(timeSeriesOnly.length).toBeGreaterThan(0);
    });

    it('offers a licensed command only when the license reaches its level', async () => {
      const [{ name, metadata }] = licensed;
      const level = metadata.license?.toLocaleLowerCase();

      expect(await textsAt('FROM a | ', license(level))).toContain(commandText(name));
      expect(await textsAt('FROM a | ', license('basic'))).not.toContain(commandText(name));
      expect(await textsAt('FROM a | ')).not.toContain(commandText(name));
    });

    it('offers a command that needs a time-series source only after one', async () => {
      const [{ name }] = timeSeriesOnly;

      expect(await textsAt('TS a | ')).toContain(commandText(name));
      expect(await textsAt('FROM a | ')).not.toContain(commandText(name));
    });

    it('does not offer a command after one of the commands it is hidden after', async () => {
      const hidden = esqlCommandRegistry
        .getAllCommands()
        .filter(({ metadata }) => metadata.hiddenAfterCommands?.length && !metadata.hidden);

      for (const { name, metadata } of hidden) {
        const [after] = metadata.hiddenAfterCommands ?? [];
        const isHeader = esqlCommandRegistry.getCommandByName(after)?.metadata.type === 'header';

        // A header command comes before the query; any other one comes before a pipe.
        if (isHeader) {
          expect(await textsAt('')).toContain(commandText(name));
          expect(await textsAt('LET a = (FROM b); ')).not.toContain(commandText(name));
        }
      }
    });
  });

  describe('keywords and the end of a command', () => {
    it('offers the keywords the grammar expects, the pipe and the next line', async () => {
      expect((await textsAt('FROM a | LIMIT 10 ')).sort()).toEqual(['\n', 'BY ', '| ']);
      expect((await textsAt('FROM a | CHANGE_POINT b ')).sort()).toEqual([
        '\n',
        'AS ',
        'BY ',
        'ON ',
        '| ',
      ]);
    });

    it('offers no end where the command cannot end', async () => {
      expect(await textsAt('FROM a | RENAME b ')).toEqual(['AS ']);
    });

    it('offers the separator of a list with a space after it', async () => {
      expect((await textsAt('FROM a | KEEP b ')).sort()).toEqual(['\n', ', ', '| ']);
    });

    it('offers each item once', async () => {
      const texts = await textsAt('FROM a | SORT b ');

      expect(new Set(texts).size).toBe(texts.length);
    });
  });
});
