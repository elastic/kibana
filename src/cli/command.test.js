/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import commander from 'commander';

import './command';

describe('Commander extensions', () => {
  const mockExit = jest.fn((exitCode) => {
    // Prevent exiting from shell, let's throw something instead.
    throw new Error('Exit ' + exitCode);
  });

  beforeAll(() => {
    process._real_exit = process.exit;

    process.exit = mockExit;
  });

  afterAll(() => {
    process.exit = process._real_exit;
  });

  describe('regular options', () => {
    it('collects multiple args', () => {
      const args = makeArgs('test1', '--code', 'xoxo', '--param', 123);

      const { collectedOptions, unknownOptions } = parseArgs('test1', ['code', 'param'], args);

      expect(collectedOptions).toEqual({ code: 'xoxo', param: 123 });
      expect(unknownOptions).toEqual({});
    });
  });

  describe('unknown args', () => {
    it('will be collected besides defined ones', () => {
      const args = makeArgs('test2', '--code', 'xoxo', '--specialConfig', 'foobar');

      const { collectedOptions, unknownOptions } = parseArgs('test2', ['code'], args);

      expect(collectedOptions).toEqual({ code: 'xoxo' });
      expect(unknownOptions).toEqual({ specialConfig: 'foobar' });
    });

    it('will be collected with dashes, when quoted', () => {
      const args = makeArgs('test3', '--code', 'xoxo', '--specialConfig', '"---foobar"');

      const { collectedOptions, unknownOptions } = parseArgs('test3', ['code'], args);

      expect(collectedOptions).toEqual({ code: 'xoxo' });
      expect(unknownOptions).toEqual({ specialConfig: '---foobar' });
    });

    it('will be collected with dashes as compound option', () => {
      const args = makeArgs('test4', '--code', 'xoxo', '--specialConfig=----foobar');

      const { collectedOptions, unknownOptions } = parseArgs('test4', ['code'], args);

      expect(collectedOptions).toEqual({ code: 'xoxo' });
      expect(unknownOptions).toEqual({ specialConfig: '----foobar' });
    });

    it('will crash if they contain bool flags', () => {
      const args = makeArgs('test5', '--code', 'xoxo', '--secretOpt', '1234', '--useSpecial');

      expect(() => parseArgs('test5', ['code'], args)).toThrow(/Exit/);

      expect(mockExit).toHaveBeenCalledWith(64);
    });

    it('will crash if they contain shorthand flags', () => {
      const args = makeArgs('test6', '--code', 'xoxo', '-xvz');

      expect(() => parseArgs('test6', ['code'], args)).toThrow(/Exit/);

      expect(mockExit).toHaveBeenCalledWith(64);
    });
  });
});

function prepareProgram(testName, options) {
  const optionsDefinitions = options.map((optionName) => {
    const short = optionName[0].toLowerCase();
    return `-${short}, --${optionName} <${optionName}>`;
  });

  let command = commander.command(testName);

  for (const option of optionsDefinitions) {
    command = command.option(option);
  }

  return command;
}

function parseArgs(testName, options, args) {
  let storedActionArgs = null;

  const command = prepareProgram(testName, options)
    .collectUnknownOptions()
    .action((command) => {
      const colllectedOptions = {};

      options.forEach((opt) => {
        colllectedOptions[opt] = command[opt];
      });

      storedActionArgs = colllectedOptions;
    });

  // Pass the args at the root command
  commander.parse(args);

  return {
    collectedOptions: storedActionArgs,
    unknownOptions: command.getUnknownOptions(),
    command,
  };
}

function makeArgs(...args) {
  return ['node', 'test.js', ...args];
}
