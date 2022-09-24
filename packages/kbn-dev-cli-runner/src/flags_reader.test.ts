/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { getFlags } from './flags';
import { FlagsReader } from './flags_reader';

const FLAGS = {
  string: 'string',
  astring: ['foo', 'bar'],
  num: '1234',
  bool: true,
  missing: undefined,
};

const basic = new FlagsReader(FLAGS);

expect.addSnapshotSerializer(createAbsolutePathSerializer());

describe('#string()', () => {
  it('returns a single string, regardless of flag count', () => {
    expect(basic.string('string')).toMatchInlineSnapshot(`"string"`);
    expect(basic.string('astring')).toBe(FLAGS.astring.at(-1));
  });

  it('returns undefined when flag is missing', () => {
    expect(basic.string('missing')).toMatchInlineSnapshot(`undefined`);
  });

  it('throws for non-string flags', () => {
    expect(() => basic.string('bool')).toThrowErrorMatchingInlineSnapshot(
      `"expected --bool to be a string"`
    );
  });

  describe('required version', () => {
    it('throws when flag is missing', () => {
      expect(() => basic.requiredString('missing')).toThrowErrorMatchingInlineSnapshot(
        `"missing required flag --missing"`
      );
    });
  });
});

describe('#arrayOfStrings()', () => {
  it('returns an array of strings for string flags, regardless of count', () => {
    expect(basic.arrayOfStrings('string')).toMatchInlineSnapshot(`
      Array [
        "string",
      ]
    `);
    expect(basic.arrayOfStrings('astring')).toMatchInlineSnapshot(`
      Array [
        "foo",
        "bar",
      ]
    `);
  });

  it('returns undefined when flag is missing', () => {
    expect(basic.arrayOfStrings('missing')).toMatchInlineSnapshot(`undefined`);
  });

  it('throws for non-string flags', () => {
    expect(() => basic.arrayOfStrings('bool')).toThrowErrorMatchingInlineSnapshot(
      `"expected --bool to be a string"`
    );
  });

  describe('required version', () => {
    it('throws when flag is missing', () => {
      expect(() => basic.requiredArrayOfStrings('missing')).toThrowErrorMatchingInlineSnapshot(
        `"missing required flag --missing"`
      );
    });
  });
});

describe('#enum()', () => {
  it('validates that values match options', () => {
    expect(basic.enum('string', ['a', 'string', 'b'])).toMatchInlineSnapshot(`"string"`);
    expect(basic.enum('missing', ['a', 'b'])).toMatchInlineSnapshot(`undefined`);
    expect(() => basic.enum('string', ['a', 'b'])).toThrowErrorMatchingInlineSnapshot(
      `"invalid --string, expected one of \\"a\\", \\"b\\""`
    );
  });
});

describe('#path()', () => {
  it('parses the string to an absolute path based on CWD', () => {
    expect(basic.path('string')).toMatchInlineSnapshot(`<absolute path>/string`);
    expect(basic.path('missing')).toMatchInlineSnapshot(`undefined`);
  });

  describe('required version', () => {
    it('throws if the flag is missing', () => {
      expect(() => basic.requiredPath('missing')).toThrowErrorMatchingInlineSnapshot(
        `"missing required flag --missing"`
      );
    });
  });

  describe('array version', () => {
    it('parses a list of paths', () => {
      expect(basic.arrayOfPaths('astring')).toMatchInlineSnapshot(`
        Array [
          <absolute path>/foo,
          <absolute path>/bar,
        ]
      `);
    });

    describe('required version', () => {
      it('throws if the flag is missing', () => {
        expect(() => basic.requiredArrayOfPaths('missing')).toThrowErrorMatchingInlineSnapshot(
          `"missing required flag --missing"`
        );
      });
    });
  });
});

describe('#number()', () => {
  it('parses strings as numbers', () => {
    expect(basic.number('num')).toMatchInlineSnapshot(`1234`);
    expect(basic.number('missing')).toMatchInlineSnapshot(`undefined`);
    expect(() => basic.number('bool')).toThrowErrorMatchingInlineSnapshot(
      `"expected --bool to be a string"`
    );
    expect(() => basic.number('string')).toThrowErrorMatchingInlineSnapshot(
      `"unable to parse --string value [string] as a number"`
    );
    expect(() => basic.number('astring')).toThrowErrorMatchingInlineSnapshot(
      `"unable to parse --astring value [bar] as a number"`
    );
  });

  describe('required version', () => {
    it('throws if the flag is missing', () => {
      expect(() => basic.requiredNumber('missing')).toThrowErrorMatchingInlineSnapshot(
        `"missing required flag --missing"`
      );
    });
  });
});

describe('#boolean()', () => {
  it('ensures flag is boolean, requires value', () => {
    expect(basic.boolean('bool')).toMatchInlineSnapshot(`true`);
    expect(() => basic.boolean('missing')).toThrowErrorMatchingInlineSnapshot(
      `"expected --missing to be a boolean"`
    );
    expect(() => basic.boolean('string')).toThrowErrorMatchingInlineSnapshot(
      `"expected --string to be a boolean"`
    );
    expect(() => basic.boolean('astring')).toThrowErrorMatchingInlineSnapshot(
      `"expected --astring to be a boolean"`
    );
  });
});

describe('#getPositionals()', () => {
  it('returns all positional arguments in flags', () => {
    const flags = new FlagsReader({
      ...FLAGS,
      _: ['a', 'b', 'c'],
    });

    expect(flags.getPositionals()).toMatchInlineSnapshot(`
      Array [
        "a",
        "b",
        "c",
      ]
    `);
  });

  it('handles missing _ flag', () => {
    const flags = new FlagsReader({});
    expect(flags.getPositionals()).toMatchInlineSnapshot(`Array []`);
  });
});

describe('#getUnused()', () => {
  it('returns a map of all unused flags', () => {
    const flags = new FlagsReader({
      a: '1',
      b: '2',
      c: '3',
    });

    expect(flags.getUnused()).toMatchInlineSnapshot(`
      Map {
        "a" => "1",
        "b" => "2",
        "c" => "3",
      }
    `);

    flags.number('a');
    flags.number('b');

    expect(flags.getUnused()).toMatchInlineSnapshot(`
      Map {
        "c" => "3",
      }
    `);
  });

  it('ignores the default flags which are forced on commands', () => {
    const rawFlags = getFlags(['--a=1'], {
      string: ['a'],
    });

    const flags = new FlagsReader(rawFlags, {
      aliases: {
        v: 'verbose',
      },
    });

    expect(flags.getUnused()).toMatchInlineSnapshot(`
      Map {
        "a" => "1",
      }
    `);
    flags.number('a');
    expect(flags.getUnused()).toMatchInlineSnapshot(`Map {}`);
  });

  it('treats aliased flags as used', () => {
    const flags = new FlagsReader(
      {
        f: true,
        force: true,
        v: true,
        verbose: true,
      },
      {
        aliases: {
          f: 'force',
          v: 'verbose',
        },
      }
    );

    expect(flags.getUnused()).toMatchInlineSnapshot(`
      Map {
        "f" => true,
        "force" => true,
      }
    `);
    flags.boolean('force');
    expect(flags.getUnused()).toMatchInlineSnapshot(`Map {}`);
    flags.boolean('v');
    expect(flags.getUnused()).toMatchInlineSnapshot(`Map {}`);
  });

  it('treats failed reads as "uses"', () => {
    const flags = new FlagsReader({ a: 'b' });

    expect(flags.getUnused()).toMatchInlineSnapshot(`
      Map {
        "a" => "b",
      }
    `);
    expect(() => flags.number('a')).toThrowError();
    expect(flags.getUnused()).toMatchInlineSnapshot(`Map {}`);
  });
});

describe('#getUsed()', () => {
  it('returns a map of all used flags', () => {
    const flags = new FlagsReader({
      a: '1',
      b: '2',
      c: '3',
    });

    expect(flags.getUsed()).toMatchInlineSnapshot(`Map {}`);

    flags.number('a');
    flags.number('b');

    expect(flags.getUsed()).toMatchInlineSnapshot(`
      Map {
        "a" => "1",
        "b" => "2",
      }
    `);
  });

  it('treats aliases flags as used', () => {
    const flags = new FlagsReader(
      {
        f: true,
        force: true,
        v: true,
        verbose: true,
      },
      {
        aliases: {
          f: 'force',
          v: 'verbose',
        },
      }
    );

    expect(flags.getUsed()).toMatchInlineSnapshot(`Map {}`);
    flags.boolean('force');
    expect(flags.getUsed()).toMatchInlineSnapshot(`
      Map {
        "force" => true,
        "f" => true,
      }
    `);
    flags.boolean('v');
    expect(flags.getUsed()).toMatchInlineSnapshot(`
      Map {
        "force" => true,
        "f" => true,
        "v" => true,
        "verbose" => true,
      }
    `);
  });

  it('treats failed reads as "uses"', () => {
    const flags = new FlagsReader({ a: 'b' });

    expect(flags.getUsed()).toMatchInlineSnapshot(`Map {}`);
    expect(() => flags.number('a')).toThrowError();
    expect(flags.getUsed()).toMatchInlineSnapshot(`
      Map {
        "a" => "b",
      }
    `);
  });
});
