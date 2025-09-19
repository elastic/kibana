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
