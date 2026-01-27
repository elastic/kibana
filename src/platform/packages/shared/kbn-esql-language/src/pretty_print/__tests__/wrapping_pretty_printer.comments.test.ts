/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../parser';
import type { WrappingPrettyPrinterOptions } from '../wrapping_pretty_printer';
import { WrappingPrettyPrinter } from '../wrapping_pretty_printer';

const reprint = (src: string, opts?: WrappingPrettyPrinterOptions) => {
  const { root } = parse(src, { withFormatting: true });
  const text = WrappingPrettyPrinter.print(root, opts);
  // console.log(JSON.stringify(root, null, 2));

  return { text };
};

const assertReprint = (src: string, expected: string = src) => {
  const text = reprint(src).text;
  // console.log(text);
  expect(text).toBe(expected);
};

describe('commands', () => {
  describe('top comments', () => {
    test('preserves single command top comment', () => {
      const query = `
//comment
FROM index
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
//comment
FROM index`);
    });

    test('over second command', () => {
      const query = `
FROM index |
//comment
LIMIT 123
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  //comment
  | LIMIT 123`);
    });

    test('over the last command', () => {
      const query = `
FROM index | SORT abc |
//comment
LIMIT 123
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | SORT abc
  //comment
  | LIMIT 123`);
    });

    test('multiple comments over multiple commands', () => {
      const query = `
// 1
// 2
/* 3 */
FROM index
/* 1
 2
 3 */
// sort
/* sort 2 */
| SORT abc
|
//comment
/* limit */
// LIMIT
LIMIT 123
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
// 1
// 2
/* 3 */
FROM index
  /* 1
 2
 3 */
  // sort
  /* sort 2 */
  | SORT abc
  //comment
  /* limit */
  // LIMIT
  | LIMIT 123`);
    });
  });

  /**
   * @todo Tests skipped, while RERANK command grammar is being stabilized. We will
   * get back to it after 9.1 release.
   */
  describe('RERANK', () => {
    test('comments around all elements', () => {
      assertReprint(
        `FROM a
  | /*0*/ RERANK /*1*/ "query" /*2*/
        ON /*3*/ field /*4*/
        WITH /*5*/ {"id": "value"} /*6*/`
      );
    });
  });
});

describe('expressions', () => {
  describe('source expression', () => {
    describe('top comments', () => {
      test('single line comment', () => {
        const query = `
FROM

  // the comment
  index
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM
  // the comment
  index`);
      });

      test('multi line comment', () => {
        const query = `
FROM

  /* the comment */
  index
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM
  /* the comment */
  index`);
      });

      test('multiple comments', () => {
        const query = `
FROM

  // 1
  /* 2 */
  // 3
  /* 4 */
  index
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM
  // 1
  /* 2 */
  // 3
  /* 4 */
  index`);
      });
    });

    describe('left comments', () => {
      test('single left comment', () => {
        const query = `
FROM /*1*/ index
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM /*1*/ index`);
      });

      test('multiple left comments', () => {
        const query = `
FROM /*1*/ /*2*/ /*3*/ index
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM /*1*/ /*2*/ /*3*/ index`);
      });

      test('multiple left comments, and multiple arguments', () => {
        const query = `
FROM index1, /*1*/ /*2*/ /*3*/ index2, index3
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index1, /*1*/ /*2*/ /*3*/ index2, index3`);
      });
    });

    describe('right comments', () => {
      test('single multi-line right comment', () => {
        const query = `
FROM index /*1*/
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index /*1*/`);
      });

      test('multiple multi-line right comments', () => {
        const query = `
FROM index /*1*/ /*2*/ /*3*/
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index /*1*/ /*2*/ /*3*/`);
      });

      test('multiple multi-line right comment and multiple arguments', () => {
        const query = `
FROM index1, index2 /*1*/ /*2*/ /*3*/, index3
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index1, index2 /*1*/ /*2*/ /*3*/, index3`);
      });

      test('a single-line comment', () => {
        const query = `
FROM index1 // 1
  , index2
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM
  index1, // 1
  index2`);
      });
    });

    test('surrounding source from three sides', () => {
      const query = `
        FROM index0,
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ index1, /* 7 */ /* 8 */ // 9
        index2
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM
  index0,
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ index1 /* 7 */ /* 8 */, // 9
  index2`);
    });
  });

  describe('column expression', () => {
    test('surrounded from three sides', () => {
      const query = `
        FROM index | KEEP
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ field /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | KEEP
      /* 1 */
      // 2
      /* 3 */
      // 4
      /* 5 */ /* 6 */ field /* 7 */ /* 8 */ // 9`);
    });

    test('nested in function', () => {
      const query = `
        FROM index | STATS fn(
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ field /* 7 */ /* 8 */ // 9
    )`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      FN(
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ field /* 7 */ /* 8 */ // 9
      )`);
    });
  });

  describe('literal expressions', () => {
    test('numeric literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ 123 /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ 123 /* 7 */ /* 8 */ // 9`);
    });

    test('string literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ "asdf" /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ "asdf" /* 7 */ /* 8 */ // 9`);
    });

    // Enable this test once triple quoted strings are properly supported
    test.skip('triple quoted string literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ """a
b""" /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ """a\nb""" /* 7 */ /* 8 */ // 9`);
    });
  });

  describe('time interval literal expressions', () => {
    test('numeric literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ 1 day /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ 1 day /* 7 */ /* 8 */ // 9`);
    });
  });

  describe('inline cast expressions', () => {
    test('numeric literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ 1::INTEGER /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ 1::integer /* 7 */ /* 8 */ // 9`);
    });
  });

  describe('list literal expressions', () => {
    test('numeric list literal, surrounded from three sides', () => {
      const query = `
        ROW
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ [1, 2, 3] /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW
  /* 1 */
  // 2
  /* 3 */
  // 4
  /* 5 */ /* 6 */ [1, 2, 3] /* 7 */ /* 8 */ // 9`);
    });
  });

  describe('list tuple expressions', () => {
    test('numeric list literal, surrounded from three sides', () => {
      assertReprint(`FROM a | WHERE b IN ()`);
      assertReprint(`FROM a | WHERE b NOT IN (/* 1 */ 123456789 /* 2 */)`);
      assertReprint(`FROM a
  | WHERE
      b IN
        (
          /* 1 */ 123456789 /* 2 */ // 3
        )`);
      assertReprint(`FROM a
  | WHERE
      b IN
        (
          /* 1 */ 123456789 /* 2 */, // 3
          "asdfasdfasdfasdfasdfasdfasdfasdfasfd" /* 4 */
        )`);
      assertReprint(`FROM a
  | WHERE
      b IN
        (
          /* 1 */ 123456789 /* 2 */, // 3
          "asdfasdfasdfasdfasdfasdfasdfasdfasfd" /* 4 */,
          /* 5 */ 123456789 /* 6 */ // 7
        )`);
    });
  });

  describe('rename expressions', () => {
    test('rename expression, surrounded from three sides', () => {
      const query = `
        ROW 1 | RENAME
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ a AS b /* 7 */ /* 8 */ // 9`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW 1
  | RENAME
      /* 1 */
      // 2
      /* 3 */
      // 4
      /* 5 */ /* 6 */ a AS
        b /* 7 */ /* 8 */ // 9`);
    });

    test('rename expression, surrounded from three sides with comments, and between other expressions', () => {
      const query = `
        ROW 1 | RENAME
        x AS y,

        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ /* 6 */ a AS b, /* 7 */ /* 8 */ // 9
        
        x AS y
        `;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
ROW 1
  | RENAME
      x AS y,
      /* 1 */
      // 2
      /* 3 */
      // 4
      /* 5 */ /* 6 */ a AS
        b /* 7 */ /* 8 */, // 9
      x AS y`);
    });

    test('rename operands surrounds from all sides', () => {
      const query = `
        ROW 1 | RENAME
        x AS y,
        /* 1 */
        /* 2 */ a /* 3 */ AS
        
        /* 4 */
        /* 5 */ b, /* 6 */
        x AS y`;
      const text = reprint(query).text;
      expect('\n' + text).toBe(`
ROW 1
  | RENAME
      x AS y,
      /* 1 */
      /* 2 */ a /* 3 */ AS
        /* 4 */
        /* 5 */ b /* 6 */,
      x AS y`);
    });
  });

  describe('as-expressions', () => {
    test('JOIN main arguments surrounded in comments', () => {
      const query = `
        FROM index | LEFT JOIN
        /* 1 */
        // 2
        /* 3 */
        // 4
        /* 5 */ a /* 6 */ /* 7 */
        ON c`;
      const text = reprint(query).text;
      expect('\n' + text).toBe(`
FROM index
  | LEFT JOIN
      /* 1 */
      // 2
      /* 3 */
      // 4
      /* 5 */ a /* 6 */ /* 7 */
        ON c`);
    });

    test('JOIN "ON" option argument comments', () => {
      const query = `
        FROM index | RIGHT JOIN a ON
        // c.1
        /* c.2 */ c /* c.3 */,
        // d.1
        /* d.2 */ d /* d.3 */`;
      const text = reprint(query).text;
      expect('\n' + text).toBe(`
FROM index
  | RIGHT JOIN
      a
        ON
          // c.1
          /* c.2 */ c /* c.3 */,
          // d.1
          /* d.2 */ d /* d.3 */`);
    });

    test('supports binary expressions', () => {
      assertReprint(
        `FROM employees
  | LEFT JOIN
      asdf
        ON
          // hello world
          /*1*/ aaaaaaaaaaaaaaaaaaaaaaaaa /*2*/ >
              /*3*/ bbbbbbbbbbbbbbbbbbbbb /*4*/ AND
            /*5*/ ccccccccccccccccccc /*6*/ ==
              /*7*/ dddddddddddddddddddddddddddddddddddddddd /*8*/`
      );
    });

    test('with AS alias, comments, and long identifiers', () => {
      const query = `FROM index | LOOKUP JOIN /* 1 */ aaaaaaaaaaaaaaaaaaaaaaaaa AS aaaaaaaaaaaaaaaaalias ON ccccccccccccccccccccccc`;
      const text = reprint(query).text;
      expect('\n' + text).toBe(`
FROM index
  | LOOKUP JOIN /* 1 */ aaaaaaaaaaaaaaaaaaaaaaaaa AS aaaaaaaaaaaaaaaaalias
        ON ccccccccccccccccccccccc`);
    });
  });

  describe('function call expressions', () => {
    describe('binary expressions', () => {
      test('first operand surrounded by inline comments', () => {
        const query = `ROW /* 1 */ /* 2 */ 1 /* 3 */ /* 4 */ + 2`;
        const text = reprint(query).text;

        expect(text).toBe(`ROW /* 1 */ /* 2 */ 1 /* 3 */ /* 4 */ + 2`);
      });

      test('second operand surrounded by inline comments', () => {
        const query = `ROW 1 * /* 1 */ /* 2 */ 2 /* 3 */ /* 4 */`;
        const text = reprint(query).text;

        expect(text).toBe(`ROW 1 * /* 1 */ /* 2 */ 2 /* 3 */ /* 4 */`);
      });

      test('right from function call', () => {
        const query = `FROM logs-*-* | WHERE QSTR("term") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */ | LIMIT 10`;
        const text = reprint(query).text;

        expect(text).toBe(
          `FROM logs-*-*
  | WHERE
      QSTR("term") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */
  | LIMIT 10`
        );
      });

      test('first operand with top comment', () => {
        const query = `ROW
          // One is important here
          1 +
          2`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  // One is important here
  1 +
    2`);
      });

      test('second operand with top comment', () => {
        const query = `ROW
        1 +
          // Two is more important here
          2`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  1 +
    // Two is more important here
    2`);
      });

      test('WHERE expression', () => {
        const query = `FROM a | STATS /* 1 */ a /* 2 */ WHERE /* 3 */ a /* 4 */ == /* 5 */ 1 /* 6 */`;
        const text = reprint(query).text;

        expect(text).toBe(
          'FROM a | STATS /* 1 */ a /* 2 */ WHERE /* 3 */ a /* 4 */ == /* 5 */ 1 /* 6 */'
        );
      });
    });

    describe('variadic call', () => {
      test('right from function call', () => {
        const query = `FROM logs-*-* | WHERE QSTR("term") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */ | LIMIT 10`;
        const text = reprint(query).text;

        expect(text).toBe(
          `FROM logs-*-*
  | WHERE
      QSTR("term") /* Search all fields using QSTR – e.g. WHERE QSTR("""debug""") */
  | LIMIT 10`
        );
      });

      test('can decorate a function call from all sides', () => {
        assertReprint(`FROM logs-*-*
  | WHERE
      // t1
      /* t2 */
      /* l1 */ /* l2 */ QSTR("term") /* r1 */ /* r2 */ // r3
  | LIMIT 10`);
      });

      test('can decorate a function call outside and inside', () => {
        assertReprint(`FROM logs-*-*
  | WHERE
      /* t0 */
      // t1
      /* t2 */
      /* l1 */ /* l2 */ QSTR(/* i1 */ "term" /* i2 */ /* i3 */) /* r1 */ /* r2 */ // r3
  | LIMIT 10`);
      });
    });
  });

  describe('map expressions', () => {
    describe('inline comments', () => {
      test('basic map, no comments', () => {
        assertReprint('ROW FUNC(1, {"a": 1})');
      });

      test('leading comment', () => {
        assertReprint('ROW FUNC(1, /* cmt */ {"a": 1})');
      });

      test('trailing comment', () => {
        assertReprint('ROW FUNC(1, {"a": 1} /* cmt */)');
      });

      test('comment before first key', () => {
        assertReprint('ROW FUNC(1, {/* cmt */ "a": 1})');
      });

      test('comment after first key', () => {
        assertReprint('ROW FUNC(1, {"a" /* cmt */: 1})');
      });

      test('comment before first value', () => {
        assertReprint('ROW FUNC(1, {"a": /* cmt */ 1})');
      });

      test('comment after first (and only) value', () => {
        assertReprint('ROW FUNC(1, {"a": 1 /* cmt */})');
      });

      test('comment before keys', () => {
        assertReprint('ROW FUNC(1, {/* 1 */ "a": 1, /* 2 */ "b": 2})');
      });

      test('comment after keys', () => {
        assertReprint('ROW FUNC(1, {"a" /* 1 */: 1, "b" /* 2 */: 2})');
      });

      test('comment before values', () => {
        assertReprint('ROW FUNC(1, {"a": /* 1 */ 1, "b": /* 2 */ 2})');
      });

      test('comment after values', () => {
        assertReprint('ROW FUNC(1, {"a": 1 /* 1 */, "b": 2 /* 2 */})');
      });
    });

    describe('single-line comments', () => {
      test('comment over map', () => {
        const src = `ROW
  FUNCTION(
    123456,
    // this is map:
    {"a": 1})`;
        assertReprint(src);
      });

      test('comment next to map', () => {
        const src = `ROW
  FUNCTION(
    123456,
    {"a": 1} // this is map
  )`;
        assertReprint(src);
      });

      test('comment over key', () => {
        const src = `ROW
  FUNCTION(
    123456,
    {
      // this is key:
      "a":
        1
    })`;
        assertReprint(src);
      });

      test('comment next to key', () => {
        const src = `ROW
  FUNCTION(
    123456,
    {
      "a": // "a" keys is very important
        1
    }
  )`;
        assertReprint(src);
      });

      test('comment over value', () => {
        const src = `ROW
  FUNCTION(
    123456,
    {
      "a":
        // this is value:
        1
    })`;
        assertReprint(src);
      });

      test('comment next to value', () => {
        const src = `ROW
  FUNCTION(
    123456,
    {
      "a":
        1 // This is a very important value
    }
  )`;
        assertReprint(src);
      });
    });

    describe('assignment representation', () => {
      test('basic assignment, no comments', () => {
        assertReprint('PROMQL index = my_index bytes[5m]');
      });

      test('leading comment before assignment entry', () => {
        assertReprint('PROMQL /* cmt */ index = my_index bytes[5m]');
      });

      test('trailing comment after assignment entry', () => {
        assertReprint('PROMQL index = my_index /* cmt */ bytes[5m]');
      });

      test('comment before key', () => {
        assertReprint('PROMQL /* before key */ index = my_index bytes[5m]');
      });

      test('comment after key', () => {
        assertReprint('PROMQL index /* after key */ = my_index bytes[5m]');
      });

      test('comment before value', () => {
        assertReprint('PROMQL index = /* before value */ my_index bytes[5m]');
      });

      test('comment after value', () => {
        assertReprint('PROMQL index = my_index /* after value */ bytes[5m]');
      });

      test('multiple assignment entries with comments', () => {
        assertReprint(
          'PROMQL /* 1 */ index = my_index /* 2 */ /* 3 */ offset = `5m` /* 4 */ bytes[5m]'
        );
      });

      test('single-line comment over assignment', () => {
        const src = `PROMQL
    // this is the index:
    index =
      my_index
  bytes[5m]`;
        assertReprint(src);
      });

      test('single-line comment after assignment', () => {
        const src = `PROMQL
    index =
      my_index // this is the index
  bytes[5m]`;
        assertReprint(src);
      });

      test('comments around assignment operator', () => {
        assertReprint('PROMQL index /* before */ = /* after */ my_index bytes[5m]');
      });

      test('multiple comments in assignment', () => {
        assertReprint('PROMQL /* a */ index /* b */ = /* c */ my_index /* d */ bytes[5m]');
      });
    });
  });

  describe('header commands', () => {
    describe('top comments', () => {
      test('single line comment before SET', () => {
        const src = `// Header comment
SET timeout = "30s";
FROM index`;
        assertReprint(src);
      });

      test('multi-line comment before SET', () => {
        const src = `/* Header comment
   with multiple lines */
SET timeout = "30s";
FROM index`;
        assertReprint(src);
      });

      test('multiple comments before SET', () => {
        const src = `// First comment
/* Second comment */
// Third comment
SET timeout = "30s";
FROM index`;
        assertReprint(src);
      });

      test('comments before multiple SET commands', () => {
        const src = `// First SET
SET timeout = "30s";
// Second SET
SET max_results = 100;
FROM index`;
        assertReprint(src);
      });
    });

    describe('left comments', () => {
      test('comment to the left of SET keyword', () => {
        const src = `/* left */ SET timeout = "30s";
FROM index`;
        assertReprint(src);
      });

      test('multiple left comments', () => {
        const src = `/* a */ /* b */ SET timeout = "30s";
FROM index`;
        assertReprint(src);
      });
    });

    describe('right comments', () => {
      test('comment at the end of SET line', () => {
        const src = `SET timeout = "30s"; // Important timeout
FROM index`;
        assertReprint(src);
      });

      test('multi-line comment after SET semicolon', () => {
        const src = `SET timeout = "30s"; /* Important */
FROM index`;
        assertReprint(src);
      });
    });

    describe('comments in SET arguments', () => {
      test('comment before identifier', () => {
        const src = `SET /* key */ timeout = "30s";
FROM index`;
        assertReprint(src);
      });

      test('comment after identifier', () => {
        const src = `SET timeout /* key */ = "30s";
FROM index`;
        assertReprint(src);
      });

      test('comment before value', () => {
        const src = `SET timeout = /* value */ "30s";
FROM index`;
        assertReprint(src);
      });

      test('comment after value', () => {
        const src = `SET timeout = "30s" /* value */;
FROM index`;
        assertReprint(src);
      });

      test('can skip header', () => {
        const text = reprint(
          `SET timeout = "30s" /* value */;
FROM index`,
          { skipHeader: true }
        ).text;

        expect(text).toBe(`FROM index`);
      });

      test('comments around assignment operator', () => {
        const src = `SET timeout /* before */ = /* after */ "30s";
FROM index`;
        assertReprint(src);
      });

      test('multiple comments in SET arguments', () => {
        const src = `SET /* a */ timeout /* b */ = /* c */ "30s" /* d */;
FROM index`;
        assertReprint(src);
      });
    });
  });

  describe('subqueries (parens)', () => {
    test('can print comments in complex subqueries', () => {
      // This single test covers comment preservation in wrapped output
      const query = [
        'FROM index1,',
        '/* before subquery */ (/* inside start */ FROM index2 /* after source */ |',
        'WHERE a > 10 /* after where */ |',
        'EVAL b = a * 2 |',
        'STATS cnt = COUNT(*) BY c |',
        'SORT cnt DESC |',
        'LIMIT 10) /* after first subquery */,',
        'index3,',
        '(FROM index4 | STATS COUNT(*)) /* after second */ |',
        'WHERE d > 10 |',
        'STATS max = MAX(*) BY e |',
        'SORT max DESC',
      ].join(' ');

      const expected = `FROM
  index1,
  /* before subquery */ (/* inside start */ FROM index2 /* after source */
    | WHERE a > 10 /* after where */
    | EVAL b = a * 2
    | STATS cnt = COUNT(*)
          BY c
    | SORT cnt DESC
    | LIMIT 10) /* after first subquery */,
  index3,
  (FROM index4 | STATS COUNT(*)) /* after second */
  | WHERE d > 10
  | STATS max = MAX(*)
        BY e
  | SORT max DESC`;

      assertReprint(query, expected);
    });
  });

  describe('FORK', () => {
    test('preserves comments in various positions', () => {
      const query = `FROM index
  /* before FORK */
  | FORK
      /* first branch */
      (
          KEEP field1, field2, field3 /* important fields */
        | WHERE x > 100 /* filter */
      )
      /* second branch */
      (
          DROP field4, field5 /* not needed */
        | LIMIT 50
      )`;

      const text = reprint(query, { multiline: true }).text;

      expect(text).toBe(query);
    });
  });
});
