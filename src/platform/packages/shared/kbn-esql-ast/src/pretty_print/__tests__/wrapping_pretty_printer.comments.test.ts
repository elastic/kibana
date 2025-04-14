/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../parser';
import { WrappingPrettyPrinter, WrappingPrettyPrinterOptions } from '../wrapping_pretty_printer';

const reprint = (src: string, opts?: WrappingPrettyPrinterOptions) => {
  const { root } = parse(src, { withFormatting: true });
  const text = WrappingPrettyPrinter.print(root, opts);

  return { text };
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
  /* 5 */ /* 6 */ index1, /* 7 */ /* 8 */ // 9
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
        /* 5 */ /* 6 */ a AS b /* 7 */ /* 8 */, // 9
        
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
        b, /* 7 */ /* 8 */ // 9
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
        /* 5 */ b, /* 6 */
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
          /* c.2 */ c, /* c.3 */
          // d.1
          /* d.2 */ d /* d.3 */`);
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
  });
});
