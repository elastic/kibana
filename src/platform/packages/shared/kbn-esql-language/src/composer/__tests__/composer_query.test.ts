/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '../esql';

test('prints the query object when casting to string', () => {
  const query = esql`FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10`;

  expect('\n' + query).toBe(`
ComposerQuery
├─ query
│  └─ FROM kibana_ecommerce_index
│       | WHERE foo > 42 AND bar < 24
│       | EVAL a = 123
│       | LIMIT 10
│
└─ params
   └─ {}`);
});

test('can dump query with AST structure', () => {
  const query = esql`ROW a = 1 + 2`;

  expect('\n' + query.dump()).toBe(`
ComposerQuery
├─ query
│  └─ ROW a = 1 + 2
│
├─ params
│  └─ {}
│
└─ ast
   └─ query
      └─ command "row"
         └─ function "="
            ├─ column "a"
            │  └─ identifier "a"
            └─ function "+"
               ├─ literal "1"
               └─ literal "2"`);
});

describe('.pipe``', () => {
  test('can add additional commands to the query', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

    query.pipe`
      WHERE foo > 42`.pipe`
      EVAL a = 123`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123'
    );

    query.pipe`LIMIT 10`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123 | LIMIT 10'
    );
  });

  test('can supply integers floats into holes', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

    query.pipe`WHERE foo > ${5.5}`.pipe`EVAL a = ${123}`;

    expect(query.print('basic')).toBe(
      'FROM kibana_ecommerce_index | WHERE foo > 5.5 | EVAL a = 123'
    );
  });

  test('can insert parameters', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    query.pipe`WHERE foo > ${esql.par(5.5)}`.pipe`EVAL a = ${esql.par(123)}`;

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > ?p0 | EVAL a = ?p1',
      params: [{ p0: 5.5 }, { p1: 123 }],
    });
  });

  test('throws when providing multiple commands in one template', () => {
    const query = esql`FROM kibana_ecommerce_index`;

    expect(() => query.pipe`WHERE foo > 123 | LIMIT 10`).toThrowErrorMatchingInlineSnapshot(
      `"Could not parse a single command completely: \\"WHERE foo > 123 | LIMIT 10\\". "`
    );
  });

  test('can parametrize a tagged template', () => {
    const query = esql`FROM index`;

    query.pipe({ foo: 'bar' })`STATS foo = LOL(?foo)`;

    expect(query.toRequest()).toEqual({
      query: 'FROM index | STATS foo = LOL(?foo)',
      params: [{ foo: 'bar' }],
    });
  });

  describe('string query syntax', () => {
    test('can generate commands using a string `.pipe(str)`', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.pipe('WHERE foo > 42').pipe('EVAL a = 123');

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | WHERE foo > 42 | EVAL a = 123'
      );
    });

    test('throws on invalid param name', () => {
      const query = esql.from('index');

      expect(() => query.pipe('WHERE foo > ?1', { '1': 42 })).toThrowErrorMatchingInlineSnapshot(
        `"Invalid parameter name \\"1\\". Parameter names cannot start with a digit or space."`
      );
    });

    test('can add parameters using string syntax, renames colliding params', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query
        .pipe('WHERE foo > ?param AND bar < ?param2', { param: 5.5, param2: 'asdf' })
        .pipe('EVAL a = ?param', { param: 123 });

      expect(query.toRequest()).toEqual({
        query:
          'FROM kibana_ecommerce_index | WHERE foo > ?param AND bar < ?param2 | EVAL a = ?param_2',
        params: [{ param: 5.5 }, { param2: 'asdf' }, { param_2: 123 }],
      });
    });
  });
});

describe('high-level helpers', () => {
  describe('.change_point()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM index`;

      query.change_point('foo');

      expect(query.print('basic')).toBe('FROM index | CHANGE_POINT foo');
    });

    test('can specify ON <key>', () => {
      const query = esql`FROM index`;

      query.change_point(['foo', 'bar'], { on: ['baz', 'qux'] });

      expect(query.print('basic')).toBe('FROM index | CHANGE_POINT foo.bar ON baz.qux');
    });

    test('can specify AS <type_name>, <pvalue_name> option', () => {
      const query = esql`FROM index`;

      query.change_point(['foo', 'bar'], { as: ['type', ['pvalue', 'name']] });

      expect(query.print('basic')).toBe('FROM index | CHANGE_POINT foo.bar AS type, pvalue.name');
    });

    test('can specify ON and AS options at the same time', () => {
      const query = esql`FROM index`;

      query.change_point(['foo', 'bar'], { as: ['type', ['pvalue', 'name']], on: ['baz', 'qux'] });

      expect(query.print('basic')).toBe(
        'FROM index | CHANGE_POINT foo.bar ON baz.qux AS type, pvalue.name'
      );
    });
  });

  describe('.dissect()', () => {
    test('can specify input column and pattern', () => {
      const query = esql`FROM index`;

      query.dissect(['foo', 'bar'], '%{date} - %{msg} - %{ip}');

      expect(query.print('basic')).toBe('FROM index | DISSECT foo.bar "%{date} - %{msg} - %{ip}"');
    });

    test('DISSECT with option', () => {
      const query = esql`FROM index`;

      query.dissect('field', 'pattern', { APPEND_SEPARATOR: ',' });

      expect(query.print('basic')).toBe(
        'FROM index | DISSECT field "pattern" APPEND_SEPARATOR = ","'
      );
    });
  });

  describe('.grok()', () => {
    test('can specify input column and pattern', () => {
      const query = esql`FROM index`;

      query.grok(['foo', 'bar'], '%{date} - %{msg} - %{ip}');

      expect(query.print('basic')).toBe('FROM index | GROK foo.bar "%{date} - %{msg} - %{ip}"');
    });
  });

  describe('.enrich()', () => {
    test('basic command with just policy', () => {
      const query = esql`FROM index`;

      query.enrich('my_policy');

      expect(query.print('basic')).toBe('FROM index | ENRICH my_policy');
    });

    test('with ON match_field', () => {
      const query = esql`FROM index`;

      query.enrich('my_policy', { on: 'match_field' });

      expect(query.print('basic')).toBe('FROM index | ENRICH my_policy ON match_field');
    });

    test('with WITH fields', () => {
      const query = esql`FROM index`;

      query.enrich('my_policy', { with: { hello: 'world', foo: ['bar', 'baz'] } });

      expect(query.print('basic')).toBe(
        'FROM index | ENRICH my_policy WITH hello = world, foo = bar.baz'
      );
    });

    test('with ON and WITH fields', () => {
      const query = esql`FROM index`;

      query.enrich('my_policy', {
        on: ['a', 'b'],
        with: { hello: 'world' },
      });

      expect(query.print('basic')).toBe('FROM index | ENRICH my_policy ON a.b WITH hello = world');
    });
  });

  describe('.limit()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.limit(10);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | LIMIT 10');

      query.limit(1).limit(2);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | LIMIT 10 | LIMIT 1 | LIMIT 2'
      );
    });
  });

  describe('.sample()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.sample(0.1);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | SAMPLE 0.1');

      query.sample(0.5).sample(0.2);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | SAMPLE 0.1 | SAMPLE 0.5 | SAMPLE 0.2'
      );
    });

    test('throws on invalid probability', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.sample(0.1);

      expect(() => {
        query.sample(-0.1);
      }).toThrowError('Probability must be between 0 and 1');

      expect(() => {
        query.sample(1.1);
      }).toThrowError('Probability must be between 0 and 1');
    });
  });

  describe('.keep()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.keep('foo', 'bar', 'my-column');

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | KEEP foo, bar, `my-column`');
    });

    test('can specify nested columns', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.keep(['user', 'name'], ['user', 'age']);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | KEEP user.name, user.age');
    });

    test('escapes special characters', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.keep(['usér', 'name'], ['user', '❤️']);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | KEEP `usér`.name, user.`❤️`'
      );
    });

    test('throws on empty list', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .keep() call
        query.keep();
      }).toThrow();
    });
  });

  describe('.drop()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index');

      query.drop('foo', 'bar', 'my-column');

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | DROP foo, bar, `my-column`');
    });

    test('can specify nested columns', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.drop(['user', 'name'], ['user', 'age']);

      expect(query.print('basic')).toBe('FROM kibana_ecommerce_index | DROP user.name, user.age');
    });

    test('escapes special characters', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.drop(['usér', 'name'], ['user', '❤️']);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | DROP `usér`.name, user.`❤️`'
      );
    });

    test('throws on empty list', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .drop() call
        query.drop();
      }).toThrow();
    });
  });

  describe('.lookup_join()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM index`;

      query.lookup_join('lookup_index', 'field1', 'field2', 'field3');

      expect(query.print('basic')).toBe(
        'FROM index | LOOKUP JOIN lookup_index ON field1, field2, field3'
      );
    });

    test('can specify nested columns', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      query.lookup_join('lookup_index', ['user', 'name'], ['user', 'age'], ['user', 'location']);

      expect(query.print('basic')).toBe(
        'FROM kibana_ecommerce_index | LOOKUP JOIN lookup_index ON user.name, user.age, user.location'
      );
    });

    test('throws on empty field list', () => {
      const query = esql`FROM index`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .lookup_join() call
        query.lookup_join('lookup_index');
      }).toThrow();
    });

    test('can specify source with alias', () => {
      const query = esql`FROM index`;

      query.lookup_join({ index: 'lookup_index', alias: 'li' }, 'field1');

      expect(query.print('basic')).toBe('FROM index | LOOKUP JOIN lookup_index AS li ON field1');
    });
  });

  describe('.mv_expand()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM index`;

      expect(query.print('basic')).toBe('FROM index');

      query.mv_expand('foo');

      expect(query.print('basic')).toBe('FROM index | MV_EXPAND foo');

      query.mv_expand(['bar', 'baz']);

      expect(query.print('basic')).toBe('FROM index | MV_EXPAND foo | MV_EXPAND bar.baz');
    });
  });

  describe('.rename()', () => {
    test('nested column names', () => {
      const query = esql`FROM index`;

      expect(query.print('basic')).toBe('FROM index');

      query.rename([
        ['foo', 'bar'],
        ['my-column', 'new-name'],
      ]);

      expect(query.print('basic')).toBe('FROM index | RENAME foo.bar = `my-column`.`new-name`');
    });

    test('multiple renames', () => {
      const query = esql`FROM index`;

      query.rename(['name2', 'name'], ['age2', 'age']);

      expect(query.print('basic')).toBe('FROM index | RENAME name2 = name, age2 = age');
    });

    test('throws on empty list', () => {
      const query = esql`FROM kibana_ecommerce_index`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .rename() call
        query.rename();
      }).toThrow();
    });
  });

  describe('.sort()', () => {
    test('appends command to the end', () => {
      const query = esql`FROM a`;

      expect(query.print('basic')).toBe('FROM a');

      query.sort(
        'xyz',
        ['foo'],
        ['bar', 'ASC'],
        ['baz', 'DESC'],
        ['qux', '', 'NULLS FIRST'],
        ['quux', 'DESC', 'NULLS LAST']
      );

      expect(query.print('basic')).toBe(
        'FROM a | SORT xyz, foo, bar ASC, baz DESC, qux NULLS FIRST, quux DESC NULLS LAST'
      );
    });

    test('can specify nested columns', () => {
      const query = esql`FROM a`;

      query.sort([['nested', 'column'], 'ASC'], [['another', 'column'], '', 'NULLS LAST']);

      expect(query.print('basic')).toBe(
        'FROM a | SORT nested.column ASC, another.column NULLS LAST'
      );
    });

    test('escapes special characters', () => {
      const query = esql`FROM a`;

      query
        .sort([['usér', 'name']])
        .sort([['address', 'emoji-❤️'], 'DESC', 'NULLS LAST'], ['emoji-❤️', 'ASC']);

      expect(query.print('basic')).toBe(
        'FROM a | SORT `usér`.name | SORT address.`emoji-❤️` DESC NULLS LAST, `emoji-❤️` ASC'
      );
    });

    test('throws on empty list', () => {
      const query = esql`ROW a = 123`;

      expect(() => {
        // @ts-expect-error - TypeScript types do not allow empty .sort() call
        query.sort();
      }).toThrow();
    });
  });

  describe('.where``', () => {
    test('appends command to the end', () => {
      const query = esql`FROM a`;

      expect(query.print('basic')).toBe('FROM a');

      query.where`abc > 123 AND xyz < 456`;

      expect(query.print('basic')).toBe('FROM a | WHERE abc > 123 AND xyz < 456');
    });

    test('can specify a parameter', () => {
      const query = esql`FROM a`;

      expect(query.print('basic')).toBe('FROM a');

      const param = 123;

      query.where`abc > fn(${{ param }})`;

      expect(query.print('basic')).toBe('FROM a | WHERE abc > FN(?param)');
    });

    test('can parametrize a tagged template', () => {
      const query = esql`FROM a`;

      expect(query.print('basic')).toBe('FROM a');

      const param = 123;

      query.where({ param, param2: 456 })`abc > fn(?param) AND xyz < fn(?param2)`;

      expect(query.print('basic')).toBe('FROM a | WHERE abc > FN(?param) AND xyz < FN(?param2)');
      expect(query.getParams()).toEqual({ param: 123, param2: 456 });
    });

    test('can parametrize a string query', () => {
      const query = esql`FROM a`;

      expect(query.print('basic')).toBe('FROM a');

      const param = 123;

      query.where('abc > fn(?param) AND xyz < fn(?param2)', { param, param2: 456 });

      expect(query.print('basic')).toBe('FROM a | WHERE abc > FN(?param) AND xyz < FN(?param2)');
      expect(query.getParams()).toEqual({ param: 123, param2: 456 });
    });
  });
});

describe('.inlineParams()', () => {
  test('can inline single parameter', () => {
    const param1 = 5.5;

    const query = esql`FROM kibana_ecommerce_index`.pipe`WHERE foo > ${esql.par(param1)}`;

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > ?p0',
      params: [{ p0: param1 }],
    });

    query.inlineParams();

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 5.5',
      params: [],
    });

    expect(query.getParams()).toEqual({});
  });

  test('can inline multiple parameters', () => {
    const param1 = 5.5;
    const param2 = 'asdf';
    const param3 = 123;

    const query = esql`FROM kibana_ecommerce_index`.pipe`WHERE foo > ${esql.par(
      param1
    )} AND bar < ${esql.par(param2)}`.pipe`EVAL a = ${esql.par(param3)}`;

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > ?p0 AND bar < ?p1 | EVAL a = ?p2',
      params: [{ p0: param1 }, { p1: param2 }, { p2: param3 }],
    });

    query.inlineParams();

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 5.5 AND bar < "asdf" | EVAL a = 123',
      params: [],
    });

    expect(query.getParams()).toEqual({});
  });

  test('no-op when no parameters', () => {
    const query = esql`FROM kibana_ecommerce_index`.pipe`WHERE foo > 42`;

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 42',
      params: [],
    });
    expect(query.getParams()).toEqual({});

    query.inlineParams();

    expect(query.toRequest()).toEqual({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 42',
      params: [],
    });
    expect(query.getParams()).toEqual({});
  });

  describe('identifier params', () => {
    test('can replace function name', () => {
      const query = esql({ par: 'myFunction' })`FROM index | WHERE ??par(1, 2, 3) > 123`;

      expect(query.print('basic')).toBe('FROM index | WHERE ??par(1, 2, 3) > 123');
      expect(query.getParams()).toEqual({
        par: 'myFunction',
      });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MYFUNCTION(1, 2, 3) > 123');
      expect(query.getParams()).toEqual({});
    });

    test('can replace function name (single `?`)', () => {
      const query = esql({ par: 'myFunction' })`FROM index | WHERE ?par(1, 2, 3) > 123`;

      expect(query.print('basic')).toBe('FROM index | WHERE ?par(1, 2, 3) > 123');
      expect(query.getParams()).toEqual({
        par: 'myFunction',
      });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MYFUNCTION(1, 2, 3) > 123');
      expect(query.getParams()).toEqual({});
    });

    test('can replace column names', () => {
      const query = esql({ par1: 'col1', par2: 'nested.col2' })`ROW FN(??par1, ??par2, 3)`;

      expect(query.print('basic')).toBe('ROW FN(??par1, ??par2, 3)');
      expect(query.getParams()).toEqual({
        par1: 'col1',
        par2: 'nested.col2',
      });

      query.inlineParams();

      expect(query.print('basic')).toBe('ROW FN(col1, nested.col2, 3)');
      expect(query.getParams()).toEqual({});
    });

    test('can replace nested column name part', () => {
      const query = esql({ par1: 'world' })`FROM a | WHERE hello.??par1.\`!\` > 42`;

      expect(query.print('basic')).toBe('FROM a | WHERE hello.??par1.`!` > 42');
      expect(query.getParams()).toEqual({
        par1: 'world',
      });
      query.inlineParams();

      expect(query.print('basic')).toBe('FROM a | WHERE hello.world.`!` > 42');
      expect(query.getParams()).toEqual({});
    });

    test('can replace nested column name part (single `?`)', () => {
      const query = esql({ par1: 'world' })`FROM a | WHERE hello.?par1.\`!\` > 42`;

      expect(query.print('basic')).toBe('FROM a | WHERE hello.?par1.`!` > 42');
      expect(query.getParams()).toEqual({
        par1: 'world',
      });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM a | WHERE hello.world.`!` > 42');
      expect(query.getParams()).toEqual({});
    });
  });

  describe('scenarios', () => {
    test('docs example', () => {
      const query = esql`FROM logs | WHERE user == ${{ userName: 'admin' }} | LIMIT ${{
        limit: 100,
      }}`;

      expect(query.print('basic')).toBe('FROM logs | WHERE user == ?userName | LIMIT ?limit');
      expect(query.getParams()).toEqual({ userName: 'admin', limit: 100 });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM logs | WHERE user == "admin" | LIMIT 100');
      expect(query.getParams()).toEqual({});
    });

    test('original request', () => {
      const query = esql(`FROM support_ticket | WHERE priority == ?priority | LIMIT ?limit`, {
        limit: 100,
        priority: 'high',
      });

      expect(query.print('basic')).toBe(
        'FROM support_ticket | WHERE priority == ?priority | LIMIT ?limit'
      );
      expect(query.getParams()).toEqual({ priority: 'high', limit: 100 });

      query.inlineParams();

      expect(query.print('basic')).toBe(
        'FROM support_ticket | WHERE priority == "high" | LIMIT 100'
      );
      expect(query.getParams()).toEqual({});
    });
  });

  describe('array params', () => {
    test('can inline integer array', () => {
      const query = esql(`FROM index | WHERE MV_CONTAINS(?values, field)`, {
        values: [1, 2, 3],
      });

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS(?values, field)');
      expect(query.getParams()).toEqual({ values: [1, 2, 3] });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS([1, 2, 3], field)');
      expect(query.getParams()).toEqual({});
    });

    test('can inline string array', () => {
      const query = esql(`FROM index | WHERE MV_CONTAINS(?values, field)`, {
        values: ['a', 'b', 'c'],
      });

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS(?values, field)');
      expect(query.getParams()).toEqual({ values: ['a', 'b', 'c'] });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS(["a", "b", "c"], field)');
      expect(query.getParams()).toEqual({});
    });

    test('can inline boolean array', () => {
      const query = esql(`FROM index | WHERE MV_CONTAINS(?values, field)`, {
        values: [true, false],
      });

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS(?values, field)');
      expect(query.getParams()).toEqual({ values: [true, false] });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS([TRUE, FALSE], field)');
      expect(query.getParams()).toEqual({});
    });

    test('can inline array with template syntax', () => {
      const values = [1, 2, 3];
      const query = esql`FROM index | WHERE MV_CONTAINS(${{ values }}, field)`;

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS(?values, field)');
      expect(query.getParams()).toEqual({ values: [1, 2, 3] });

      query.inlineParams();

      expect(query.print('basic')).toBe('FROM index | WHERE MV_CONTAINS([1, 2, 3], field)');
      expect(query.getParams()).toEqual({});
    });

    test('throws on empty array', () => {
      const query = esql(`FROM index | WHERE MV_CONTAINS(?values, field)`, {
        values: [],
      });

      expect(() => query.inlineParams()).toThrow('Cannot create an empty list literal');
    });

    test('throws on mixed type array', () => {
      const query = esql(`FROM index | WHERE MV_CONTAINS(?values, field)`, {
        values: [1, 'a', 2] as unknown as number[],
      });

      expect(() => query.inlineParams()).toThrow(
        'All list elements must be of the same type. Expected "number", but found "string" at index 1'
      );
    });
  });
});

describe('.toRequest()', () => {
  test('can return query as "request" object', () => {
    const query = esql`
      FROM kibana_ecommerce_index
      | WHERE foo > 42 AND bar < 24
      | EVAL a = 123
      | LIMIT 10`;

    expect(query.toRequest()).toMatchObject({
      query: 'FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10',
      params: [],
    });
  });
});

describe('.header``', () => {
  test('can add a header SET command', () => {
    const query = esql`
      FROM kibana_ecommerce_index
      | WHERE foo > 42 AND bar < 24
      | EVAL a = 123
      | LIMIT 10`;

    query.header`SET x = 10`;

    expect(query.print('basic')).toBe(
      'SET x = 10; FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10'
    );
  });

  test('can chain together and add multiple commands', () => {
    // prettier-ignore
    const query = esql.from('kibana_ecommerce_index')
      .header `SET x = 10`
      .header `SET y = "asdf";` // comma at the end should be ignored
      .header `SET z = false`
      .pipe `WHERE foo > 42 AND bar < 24`
      .pipe `EVAL a = 123`
      .pipe `LIMIT 10`;

    expect(query.print('basic')).toBe(
      'SET x = 10; SET y = "asdf"; SET z = FALSE; FROM kibana_ecommerce_index | WHERE foo > 42 AND bar < 24 | EVAL a = 123 | LIMIT 10'
    );
  });
});

describe('SET commands', () => {
  describe('.addSetCommand()', () => {
    test('can add a SET command to an existing query', () => {
      const query = esql`FROM index | WHERE bar > 42 | LIMIT 10`;

      query.addSetCommand('setting1', 'value1');

      expect(query.print('basic')).toBe(
        'SET setting1 = "value1"; FROM index | WHERE bar > 42 | LIMIT 10'
      );
      expect(query.ast.header?.length).toBe(1);
    });

    test('can add multiple SET commands', () => {
      const query = esql`FROM index | LIMIT 10`;

      query.addSetCommand('a', 'foo');
      query.addSetCommand('b', 123);
      query.addSetCommand('c', true);

      const printed = query.print('basic');

      expect(printed).toContain('SET a = "foo"');
      expect(printed).toContain('SET b = 123');
      expect(printed).toContain('SET c = TRUE');
      expect(query.ast.header?.length).toBe(3);
    });

    test('returns ComposerQuery for chaining', () => {
      const query = esql`FROM index | LIMIT 10`;

      const result = query.addSetCommand('x', 1).addSetCommand('y', 2);

      expect(result).toBe(query);
      expect(query.ast.header?.length).toBe(2);
    });
  });

  describe('.getSetInstructions()', () => {
    test('returns empty array for query without SET commands', () => {
      const query = esql`FROM index | LIMIT 10`;

      const sets = query.getSetInstructions();

      expect(sets).toEqual([]);
    });

    test('returns SET commands after adding them', () => {
      const query = esql`FROM index | LIMIT 10`;

      query.addSetCommand('x', 'test');
      query.addSetCommand('y', 42);
      query.addSetCommand('z', false);

      const sets = query.getSetInstructions();

      expect(sets).toMatchObject([
        ['x', { type: 'literal' }],
        ['y', { type: 'literal' }],
        ['z', { type: 'literal' }],
      ]);
    });
  });

  describe('.removeSetCommand()', () => {
    test('removes specific SET command by name', () => {
      const query = esql`FROM index | LIMIT 10`;

      query.addSetCommand('a', 'foo');
      query.addSetCommand('b', 123);
      query.addSetCommand('c', true);

      query.removeSetCommand('b');

      const sets = query.getSetInstructionRecord();

      expect(sets).toEqual({
        a: 'foo',
        c: true,
      });
      expect(query.print('basic')).not.toContain('SET b = 123');
      expect(query.print('basic')).toContain('SET a = "foo"');
      expect(query.print('basic')).toContain('SET c = TRUE');
    });

    test('does nothing if SET command does not exist', () => {
      const query = esql`FROM index | LIMIT 10`;
      query.addSetCommand('a', 'foo');

      query.removeSetCommand('nonexistent');

      const sets = query.getSetInstructionRecord();
      expect(sets).toEqual({ a: 'foo' });
    });

    test('works on query without SET commands', () => {
      const query = esql`FROM index | LIMIT 10`;

      expect(() => query.removeSetCommand('a')).not.toThrow();
      expect(query.getSetInstructions()).toEqual([]);
    });

    test('returns ComposerQuery for chaining', () => {
      const query = esql`FROM index | LIMIT 10`;
      query.addSetCommand('x', 1);

      const result = query.removeSetCommand('x');

      expect(result).toBe(query);
    });
  });

  describe('.clearSetCommands()', () => {
    test('removes all SET commands', () => {
      const query = esql`SET a = "foo"; SET b = 123; SET c = TRUE; FROM index | LIMIT 10`;

      query.clearSetCommands();

      expect(query.getSetInstructions()).toEqual([]);
      expect(query.print('basic')).toBe('FROM index | LIMIT 10');
    });

    test('does nothing if no SET commands exist', () => {
      const query = esql`FROM index | LIMIT 10`;

      expect(() => query.clearSetCommands()).not.toThrow();
      expect(query.getSetInstructions()).toEqual([]);
    });

    test('returns ComposerQuery for chaining', () => {
      const query = esql`FROM index | LIMIT 10`;

      const result = query.clearSetCommands();

      expect(result).toBe(query);
    });
  });

  describe('SET commands with .pipe()', () => {
    test('can chain commands after adding SET', () => {
      const query = esql`FROM index`;

      query.addSetCommand('x', 1);
      query.pipe`WHERE foo > 10`;
      query.pipe`LIMIT 5`;

      expect(query.print('basic')).toBe('SET x = 1; FROM index | WHERE foo > 10 | LIMIT 5');
    });

    test('SET commands remain when modifying query', () => {
      const query = esql`FROM index | LIMIT 10`;

      query.addSetCommand('a', 'test');
      query.pipe`WHERE bar == 42`;

      expect(query.print('basic')).toBe('SET a = "test"; FROM index | LIMIT 10 | WHERE bar == 42');
    });
  });

  describe('SET command value types', () => {
    test('handles string values', () => {
      const query = esql`FROM index`;
      query.addSetCommand('str', 'hello world');

      const sets = query.getSetInstructionRecord();
      expect(sets.str).toBe('hello world');
      expect(query.print('basic')).toBe('SET str = "hello world"; FROM index');
    });

    test('handles numeric values', () => {
      const query = esql`FROM index`;

      query.addSetCommand('int', 42);
      query.addSetCommand('float', 3.14);

      const sets = query.getSetInstructionRecord();

      expect(sets).toEqual({
        int: 42,
        float: 3.14,
      });
      expect(query.print('basic')).toBe('SET int = 42; SET float = 3.14; FROM index');
    });

    test('handles boolean values', () => {
      const query = esql`FROM index`;
      query.addSetCommand('bool_true', true);
      query.addSetCommand('bool_false', false);

      const sets = query.getSetInstructionRecord();

      expect(sets).toEqual({
        bool_true: true,
        bool_false: false,
      });
    });
  });

  describe('SET header instructions in template tag', () => {
    test('can create a query with a single SET instruction', () => {
      const query = esql`SET a = 123; FROM index | LIMIT 10`;

      expect(query.print('basic')).toBe('SET a = 123; FROM index | LIMIT 10');
      expect(query.ast.header).toBeDefined();
      expect(query.ast.header).toHaveLength(1);
      expect(query.getSetInstructionRecord()).toEqual({
        a: 123,
      });
    });

    test('can create a query with multiple SET instructions', () => {
      const query = esql`SET a = "foo"; SET b = 123; SET c = TRUE; FROM index | LIMIT 10`;

      const printed = query.print('basic');
      expect(printed).toContain('SET a = "foo"');
      expect(printed).toContain('SET b = 123');
      expect(printed).toContain('SET c = TRUE');
      expect(query.ast.header).toHaveLength(3);
      expect(query.getSetInstructionRecord()).toEqual({
        a: 'foo',
        b: 123,
        c: true,
      });
    });

    test('can create a query with SET and use params in query body', () => {
      const query = esql`SET threshold = 100; FROM index | WHERE value > ?threshold`;

      expect(query.print('basic')).toBe(
        'SET threshold = 100; FROM index | WHERE value > ?threshold'
      );
      expect(query.ast.header).toHaveLength(1);
    });

    test('can combine SET instructions with string template', () => {
      const query = esql('SET x = 10; FROM index | LIMIT 20');

      expect(query.print('basic')).toBe('SET x = 10; FROM index | LIMIT 20');
      expect(query.getSetInstructionRecord()).toEqual({ x: 10 });
    });

    test('can combine SET instructions with parametrized query', () => {
      const threshold = 100;
      const limit = 10;
      const query = esql('SET x = 5; FROM index | WHERE value > ?threshold | LIMIT ?limit', {
        threshold,
        limit,
      });

      expect(query.print('basic')).toBe(
        'SET x = 5; FROM index | WHERE value > ?threshold | LIMIT ?limit'
      );
      expect(query.getSetInstructionRecord()).toEqual({ x: 5 });
      expect(query.getParams()).toEqual({ threshold: 100, limit: 10 });
    });

    test('SET instructions work with ROW command', () => {
      const query = esql`SET x = 10; ROW a = 1, b = 2`;

      expect(query.print('basic')).toBe('SET x = 10; ROW a = 1, b = 2');
      expect(query.ast.header).toHaveLength(1);
      expect(query.ast.commands[0].name).toBe('row');
    });

    test('can interpolate values into SET instructions', () => {
      const value = 42;
      const query = esql`SET limit = ${value}; FROM index | LIMIT ?limit`;

      expect(query.print('basic')).toBe('SET `limit` = 42; FROM index | LIMIT ?limit');
      expect(query.getSetInstructionRecord()).toEqual({ limit: 42 });
    });

    test('can use parameter holes in SET instructions', () => {
      const myLimit = 100;
      const query = esql`SET limit = ${{ myLimit }}; FROM index | WHERE count > 10`;

      expect(query.print('basic')).toBe('SET `limit` = ?myLimit; FROM index | WHERE count > 10');
      expect(query.getParams()).toEqual({ myLimit: 100 });
    });

    test('combining SET instructions from template with .addSetCommand()', () => {
      const query = esql`SET a = 1; FROM index | LIMIT 10`;
      query.addSetCommand('b', 2);
      query.addSetCommand('c', 3);

      const printed = query.print('basic');
      expect(printed).toContain('SET a = 1');
      expect(printed).toContain('SET b = 2');
      expect(printed).toContain('SET c = 3');
      expect(query.ast.header).toHaveLength(3);
    });

    test('can use .removeSetCommand() on SET instructions from template', () => {
      const query = esql`SET a = 1; SET b = 2; FROM index`;
      query.removeSetCommand('b');

      const printed = query.print('basic');
      expect(printed).toContain('SET a = 1');
      expect(printed).not.toContain('SET b = 2');
      expect(query.getSetInstructionRecord()).toEqual({ a: 1 });
    });

    test('can clear all SET instructions including those from template', () => {
      const query = esql`SET a = 1; SET b = 2; FROM index`;
      query.clearSetCommands();

      expect(query.print('basic')).toBe('FROM index');
      expect(query.getSetInstructions()).toEqual([]);
    });

    test('SET instructions with complex nested queries', () => {
      const subQuery = esql`WHERE bytes > 1000`;
      const query = esql`SET threshold = 1000; FROM logs | FORK (${subQuery}) (WHERE level == "error")`;

      expect(query.print('basic')).toContain('SET threshold = 1000');
      expect(query.ast.header).toHaveLength(1);
    });

    test('toRequest() includes SET instructions', () => {
      const query = esql`SET x = 10; FROM index | WHERE value > ?threshold`;
      query.setParam('threshold', 100);

      const request = query.toRequest();

      expect(request.query).toContain('SET x = 10');
      expect(request.query).toContain('FROM index');
      expect(request.params).toEqual([{ threshold: 100 }]);
    });

    test('multiple SET instructions with semicolon separator', () => {
      const query = esql`SET a = 1; SET b = 2; SET c = 3; FROM index`;

      expect(query.ast.header).toHaveLength(3);
      expect(query.getSetInstructions()).toHaveLength(3);
    });

    test('works with parametrized template wrapper', () => {
      const initialParam = 50;
      const query = esql({ initialParam })`SET x = 10; FROM index | WHERE value > ?initialParam`;

      expect(query.print('basic')).toBe('SET x = 10; FROM index | WHERE value > ?initialParam');
      expect(query.getParams()).toEqual({ initialParam: 50 });
      expect(query.getSetInstructionRecord()).toEqual({ x: 10 });
    });
  });
});
