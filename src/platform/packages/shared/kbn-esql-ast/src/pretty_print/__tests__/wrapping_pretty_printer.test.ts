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
  const { root } = parse(src);
  const text = WrappingPrettyPrinter.print(root, opts);

  // console.log(JSON.stringify(root.commands, null, 2));

  return { text };
};

describe('commands', () => {
  describe('JOIN', () => {
    test('with short identifiers', () => {
      const { text } = reprint('FROM a | RIGHT JOIN b ON d, e');

      expect(text).toBe('FROM a | RIGHT JOIN b ON d, e');
    });

    test('with long identifiers', () => {
      const { text } = reprint(
        'FROM aaaaaaaaaaaa | RIGHT JOIN bbbbbbbbbbbbbbbbb ON dddddddddddddddddddddddddddddddddddddddd, eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      );

      expect('\n' + text).toBe(`
FROM aaaaaaaaaaaa
  | RIGHT JOIN bbbbbbbbbbbbbbbbb
        ON
          dddddddddddddddddddddddddddddddddddddddd,
          eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`);
    });
  });

  describe('GROK', () => {
    test('two basic arguments', () => {
      const { text } = reprint('FROM search-movies | GROK Awards "text"');

      expect(text).toBe('FROM search-movies | GROK Awards "text"');
    });

    test('two long arguments', () => {
      const { text } = reprint(
        'FROM search-movies | GROK AwardsAwardsAwardsAwardsAwardsAwardsAwardsAwards "texttexttexttexttexttexttexttexttexttexttexttexttexttexttext"'
      );

      expect('\n' + text).toBe(`
FROM search-movies
  | GROK
      AwardsAwardsAwardsAwardsAwardsAwardsAwardsAwards
      "texttexttexttexttexttexttexttexttexttexttexttexttexttexttext"`);
    });
  });

  describe('DISSECT', () => {
    test('two basic arguments', () => {
      const { text } = reprint('FROM index | DISSECT input "pattern"');

      expect(text).toBe('FROM index | DISSECT input "pattern"');
    });

    test('two long arguments', () => {
      const { text } = reprint(
        'FROM index | DISSECT InputInputInputInputInputInputInputInputInputInputInputInputInputInput "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern"'
      );

      expect('\n' + text).toBe(`
FROM index
  | DISSECT
      InputInputInputInputInputInputInputInputInputInputInputInputInputInput
      "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern"`);
    });

    test('with APPEND_SEPARATOR option', () => {
      const { text } = reprint(
        'FROM index | DISSECT input "pattern" APPEND_SEPARATOR="<separator>"'
      );

      expect(text).toBe('FROM index | DISSECT input "pattern" APPEND_SEPARATOR = "<separator>"');
    });

    test('two long arguments with short APPEND_SEPARATOR option', () => {
      const { text } = reprint(
        'FROM index | DISSECT InputInputInputInputInputInputInputInputInputInputInputInputInputInput "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern" APPEND_SEPARATOR="sep"'
      );

      expect('\n' + text).toBe(`
FROM index
  | DISSECT
      InputInputInputInputInputInputInputInputInputInputInputInputInputInput
      "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern"
        APPEND_SEPARATOR = "sep"`);
    });

    test('two long arguments with long APPEND_SEPARATOR option', () => {
      const { text } = reprint(
        'FROM index | DISSECT InputInputInputInputInputInputInputInputInputInputInputInputInputInput "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern" APPEND_SEPARATOR="<SeparatorSeparatorSeparatorSeparatorSeparatorSeparatorSeparatorSeparator>"'
      );

      expect('\n' + text).toBe(`
FROM index
  | DISSECT
      InputInputInputInputInputInputInputInputInputInputInputInputInputInput
      "PatternPatternPatternPatternPatternPatternPatternPatternPatternPattern"
        APPEND_SEPARATOR =
          "<SeparatorSeparatorSeparatorSeparatorSeparatorSeparatorSeparatorSeparator>"`);
    });
  });
});

describe('casing', () => {
  test('can chose command name casing', () => {
    const query = 'FROM index | WHERE a == 123';
    const text1 = reprint(query, { lowercase: true }).text;
    const text2 = reprint(query, { lowercaseCommands: true }).text;
    const text3 = reprint(query, { lowercaseCommands: false }).text;

    expect(text1).toBe('from index | where a == 123');
    expect(text2).toBe('from index | where a == 123');
    expect(text3).toBe('FROM index | WHERE a == 123');
  });

  test('can chose command option name casing', () => {
    const text1 = reprint('FROM a METADATA b', { lowercaseOptions: true }).text;
    const text2 = reprint('FROM a METADATA b', { lowercaseOptions: false }).text;

    expect(text1).toBe('FROM a metadata b');
    expect(text2).toBe('FROM a METADATA b');
  });

  test('can chose function name casing', () => {
    const query = 'FROM index | STATS FN1(), FN2(), FN3()';
    const text1 = reprint(query, { lowercase: true }).text;
    const text2 = reprint(query, { lowercaseFunctions: true }).text;
    const text3 = reprint(query, { lowercaseFunctions: false }).text;

    expect(text1).toBe('from index | stats fn1(), fn2(), fn3()');
    expect(text2).toBe('FROM index | STATS fn1(), fn2(), fn3()');
    expect(text3).toBe('FROM index | STATS FN1(), FN2(), FN3()');
  });

  test('can choose keyword casing', () => {
    const query = 'FROM index | RENAME a AS b';
    const text1 = reprint(query, { lowercase: true }).text;
    const text2 = reprint(query, { lowercaseKeywords: true }).text;
    const text3 = reprint(query, { lowercaseKeywords: false }).text;

    expect(text1).toBe('from index | rename a as b');
    expect(text2).toBe('FROM index | RENAME a as b');
    expect(text3).toBe('FROM index | RENAME a AS b');
  });

  test('can chose keyword casing (function nodes)', () => {
    const query = 'FROM index | WHERE a LIKE "b"';
    const text1 = reprint(query, { lowercase: true }).text;
    const text2 = reprint(query, { lowercaseKeywords: true }).text;
    const text3 = reprint(query, { lowercaseKeywords: false }).text;

    expect(text1).toBe('from index | where a like "b"');
    expect(text2).toBe('FROM index | WHERE a like "b"');
    expect(text3).toBe('FROM index | WHERE a LIKE "b"');
  });
});

describe('short query', () => {
  test('can format a simple query to one line', () => {
    const query = 'FROM index | WHERE a == 123';
    const text = reprint(query).text;

    expect(text).toBe('FROM index | WHERE a == 123');
  });

  test('one line query respects indentation option', () => {
    const query = 'FROM index | WHERE a == 123';
    const text = reprint(query, { indent: '    ' }).text;

    expect(text).toBe('    FROM index | WHERE a == 123');
  });

  test('can force small query onto multiple lines', () => {
    const query = 'FROM index | WHERE a == 123';
    const text = reprint(query, { multiline: true }).text;

    expect('\n' + text).toBe(`
FROM index
  | WHERE a == 123`);
  });

  test('with initial indentation', () => {
    const query = 'FROM index | WHERE a == 123';
    const text = reprint(query, { multiline: true, indent: '>' }).text;

    expect('\n' + text).toBe(`
>FROM index
>  | WHERE a == 123`);
  });
});

describe('long query', () => {
  describe('command arguments', () => {
    test('wraps source list', () => {
      const query =
        'FROM index, another_index, yet_another_index, on-more-index, last_index, very_last_index, ok_this_is_the_last_index';
      const text = reprint(query, { indent: '- ' }).text;

      expect('\n' + text).toBe(`
- FROM index, another_index, yet_another_index, on-more-index, last_index,
-       very_last_index, ok_this_is_the_last_index`);
    });

    test('wraps source list, leaves one item on last line', () => {
      const query =
        'FROM index, another_index, yet_another_index, on-more-index, last_index, very_last_index';
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index, another_index, yet_another_index, on-more-index, last_index,
      very_last_index`);
    });

    test('for a single very long source, prints a standalone line', () => {
      const query =
        'FROM index_another_index_yet_another_index_on-more-index_last_index_very_last_index';
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM
  index_another_index_yet_another_index_on-more-index_last_index_very_last_index`);
    });

    test('keeps sources in a list, as long as at least two fit per line', () => {
      const query = `
FROM xxxxxxxxxx, yyyyyyyyyyy, zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz, aaaa,
  bbbbbbbbbbbbbbbbbbb, ccccccccccccccccccccccccccc, gggggggggggggggg
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM xxxxxxxxxx, yyyyyyyyyyy, zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz, aaaa,
      bbbbbbbbbbbbbbbbbbb, ccccccccccccccccccccccccccc, gggggggggggggggg`);
    });

    test('keeps sources in a list, even if the last item consumes more than a line', () => {
      const query = `
FROM xxxxxxxxxx, yyyyyyyyyyy, zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz, aaaa,
  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM xxxxxxxxxx, yyyyyyyyyyy, zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz, aaaa,
      bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`);
    });

    test('breaks sources per-line, if list layout results into alone source per line', () => {
      const query = `
FROM xxxxxxxxxx, yyyyyyyyyyy, zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz,
  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,  // <------------ this one
  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, ccccccc, ggggggggg
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM
  xxxxxxxxxx,
  yyyyyyyyyyy,
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz,
  aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
  ccccccc,
  ggggggggg`);
    });

    test('breaks sources per-line, whe there is one large source', () => {
      const query = `
FROM xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx, // <------------ this one
  yyyyyyyyyyy, ccccccc, ggggggggg
  `;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM
  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,
  yyyyyyyyyyy,
  ccccccc,
  ggggggggg`);
    });
  });

  describe('command option', () => {
    test('prints short query on a single line', () => {
      const query = 'FROM index METADATA _id';
      const text = reprint(query).text;

      expect(text).toBe(`FROM index METADATA _id`);
    });

    test('breaks METADATA option to new line, when query reaches wrapping threshold', () => {
      const query = `
FROM index1, index2, index2, index3, index4, index5, index6 METADATA _id, _source`;
      const text = reprint(query, { pipeTab: '  ' }).text;

      expect('\n' + text).toBe(`
FROM index1, index2, index2, index3, index4, index5, index6
    METADATA _id, _source`);
    });

    test("indents options such that they don't align with sub-commands", () => {
      const query = `
FROM index1, index2, index2, index3, index4, index5, index6  METADATA _id, _source
| WHERE language == "javascript"
| LIMIT 123`;
      const text = reprint(query, { pipeTab: '  ' }).text;

      expect('\n' + text).toBe(`
FROM index1, index2, index2, index3, index4, index5, index6
    METADATA _id, _source
  | WHERE language == "javascript"
  | LIMIT 123`);
    });

    test('indents METADATA option differently than the LIMIT pipe', () => {
      const query = `
FROM index1, index2, index2, index3, index4, index5, index6 METADATA _id, _source | LIMIT 10`;
      const text = reprint(query, { pipeTab: '  ' }).text;

      expect('\n' + text).toBe(`
FROM index1, index2, index2, index3, index4, index5, index6
    METADATA _id, _source
  | LIMIT 10`);
    });

    test('indents METADATA option differently than main FROM arguments', () => {
      const query = `
FROM index1, index2, index2, index3, index4, index5, index6, index7, index8, index9, index10, index11, index12, index13, index14, index15, index16, index17 METADATA _id, _source`;
      const text = reprint(query, { pipeTab: '  ' }).text;

      expect('\n' + text).toBe(`
FROM index1, index2, index2, index3, index4, index5, index6, index7, index8,
      index9, index10, index11, index12, index13, index14, index15, index16,
      index17
    METADATA _id, _source`);
    });

    test('indents METADATA option differently than main FROM arguments when broken per line', () => {
      const query = `
FROM index_index_index_index_index_index_index_index_index_index_index_index_1, index_index_index_index_index_index_index_index_index_index_index_index_2, index_index_index_index_index_index_index_index_index_index_index_index_3 METADATA _id, _source`;
      const text = reprint(query, { pipeTab: '  ' }).text;

      expect('\n' + text).toBe(`
FROM
  index_index_index_index_index_index_index_index_index_index_index_index_1,
  index_index_index_index_index_index_index_index_index_index_index_index_2,
  index_index_index_index_index_index_index_index_index_index_index_index_3
    METADATA _id, _source`);
    });

    test('indents METADATA option different than the source list', () => {
      const query =
        'FROM index, another_index, another_index, a_very_very_long_index_a_very_very_long_index_a_very_very_long_index, another_index, another_index METADATA _id, _source';
      const text = reprint(query, { indent: '👉 ' }).text;

      expect('\n' + text).toBe(`
👉 FROM
👉   index,
👉   another_index,
👉   another_index,
👉   a_very_very_long_index_a_very_very_long_index_a_very_very_long_index,
👉   another_index,
👉   another_index
👉     METADATA _id, _source`);
    });

    test('can break multiple options', () => {
      const query =
        'from a | enrich policy ON match_field_which_is_very_long WITH new_name1 = field1, new_name2 = field2';
      const text = reprint(query, { indent: '👉 ' }).text;

      expect('\n' + text).toBe(`
👉 FROM a
👉   | ENRICH policy
👉         ON match_field_which_is_very_long
👉         WITH new_name1 = field1, new_name2 = field2`);
    });

    test('can break multiple options and wrap option arguments', () => {
      const query =
        'from a | enrich policy ON match_field WITH new_name1 = field1, new_name2 = field2, new_name3 = field3, new_name4 = field4, new_name5 = field5, new_name6 = field6, new_name7 = field7, new_name8 = field8, new_name9 = field9, new_name10 = field10';
      const text = reprint(query, { indent: '👉 ' }).text;

      expect('\n' + text).toBe(`
👉 FROM a
👉   | ENRICH policy
👉         ON match_field
👉         WITH new_name1 = field1, new_name2 = field2, new_name3 = field3,
👉           new_name4 = field4, new_name5 = field5, new_name6 = field6,
👉           new_name7 = field7, new_name8 = field8, new_name9 = field9,
👉           new_name10 = field10`);
    });
  });

  describe('function call arguments', () => {
    test('renders a one line list, if there is enough space', () => {
      const query = `
FROM index
| STATS avg(height), sum(weight), min(age), max(age), count(*)
| LIMIT 10
`;
      const text = reprint(query, { indent: '- ' }).text;

      expect('\n' + text).toBe(`
- FROM index
-   | STATS AVG(height), SUM(weight), MIN(age), MAX(age), COUNT(*)
-   | LIMIT 10`);
    });

    test('wraps function list', () => {
      const query = `
FROM index
| STATS avg(height), sum(weight), min(age), max(age), count(*), super_function(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
| LIMIT 10
`;
      const text = reprint(query, { indent: '- ' }).text;

      expect('\n' + text).toBe(`
- FROM index
-   | STATS AVG(height), SUM(weight), MIN(age), MAX(age), COUNT(*),
-       SUPER_FUNCTION(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
-   | LIMIT 10`);
    });

    test('wraps function arguments', () => {
      const query = `
FROM index
| STATS avg(height),
    super_function(some_column, another_column == "this is string", 1234567890.999991),
    sum(weight)
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      AVG(height),
      SUPER_FUNCTION(some_column, another_column == "this is string",
        1234567890.999991),
      SUM(weight)
  | LIMIT 10`);
    });

    test('single long function argument is broken by line', () => {
      const query = `
FROM index | STATS super_function("xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx")
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      SUPER_FUNCTION(
        "xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx")`);
    });

    test('break by line function arguments, when wrapping is not enough', () => {
      const query = `
FROM index
| STATS avg(height),
    super_function("xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx", "yyyy-yyyy-yyyyyyyyyyyy-yyyy-yyyyyyyyyyyy", "zzzz-zzzz-zzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz"),
    sum(weight)
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      AVG(height),
      SUPER_FUNCTION(
        "xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx",
        "yyyy-yyyy-yyyyyyyyyyyy-yyyy-yyyyyyyyyyyy",
        "zzzz-zzzz-zzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz"),
      SUM(weight)
  | LIMIT 10`);
    });

    test('break by line last function arguments, when wrapping is not enough', () => {
      const query = `
FROM index
| STATS avg(height),
    super_function("xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx", "yyyy-yyyy-yyyyyyyyyyyy-yyyy-yyyyyyyyyyyy", "zzzz-zzzz-zzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz"),
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      AVG(height),
      SUPER_FUNCTION(
        "xxxx-xxxx-xxxxxxxxxxxx-xxxx-xxxxxxxx",
        "yyyy-yyyy-yyyyyyyyyyyy-yyyy-yyyyyyyyyyyy",
        "zzzz-zzzz-zzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz")
  | LIMIT 10`);
    });

    test('break by line when wrapping would results in lines with a single item', () => {
      const query = `
FROM index
| STATS avg(height),
    super_function("xxxx-xxxx-xxxxxxxxxxxxx-xxxxx-xxxxxxxx",
      1234567890 + 1234567890,
      "zzzz-zzzz-zzzzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz"),
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      AVG(height),
      SUPER_FUNCTION(
        "xxxx-xxxx-xxxxxxxxxxxxx-xxxxx-xxxxxxxx",
        1234567890 + 1234567890,
        "zzzz-zzzz-zzzzzzzzzzzzzzzzz-zzzz-zzzzzzzzzzzzzz")
  | LIMIT 10`);
    });

    test('break by line when wrapping would results in lines with a single item - 2', () => {
      const query = `
FROM index
| STATS avg(height),
    super_function(func1(123 + 123123 - 12333.33 / FALSE), func2("abrakadabra what?"), func3(), func4()),
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      AVG(height),
      SUPER_FUNCTION(
        FUNC1(123 + 123123 - 12333.33 / FALSE),
        FUNC2("abrakadabra what?"),
        FUNC3(),
        FUNC4())
  | LIMIT 10`);
    });

    test('can vertically flatten adjacent binary expressions of the same precedence', () => {
      const query = `
FROM index
| STATS super_function_name(0.123123123123123 + 888811112.232323123123 + 123123123123.123123123 + 23232323.23232323123 - 123 + 999)),
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      SUPER_FUNCTION_NAME(
        0.123123123123123 +
          888811112.2323232 +
          123123123123.12312 +
          23232323.232323233 -
          123 +
          999)`);
    });
  });

  describe('binary expressions', () => {
    test('can break a standalone binary expression (+) to two lines', () => {
      const query = `
FROM index
| STATS super_function_name("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" + "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
| LIMIT 10
`;
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM index
  | STATS
      SUPER_FUNCTION_NAME(
        "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" +
          "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
  | LIMIT 10`);
    });

    describe('vertical flattening', () => {
      test('binary expressions of different precedence are not flattened', () => {
        const query = `
FROM index
| STATS fn(123456789 + 123456789 - 123456789 + 123456789 - 123456789 + 123456789 - 123456789)),
| LIMIT 10
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index
  | STATS
      FN(
        123456789 +
          123456789 -
          123456789 +
          123456789 -
          123456789 +
          123456789 -
          123456789)`);
      });

      test('binary expressions vertical flattening child function function argument wrapping', () => {
        const query = `
FROM index
| STATS super_function_name(11111111111111.111 + 11111111111111.111 * 11111111111111.111 + another_function_goes_here("this will get wrapped", "at this word", "and one more long string") - 111 + 111)),
| LIMIT 10
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index
  | STATS
      SUPER_FUNCTION_NAME(
        11111111111111.111 +
          11111111111111.111 * 11111111111111.111 +
          ANOTHER_FUNCTION_GOES_HERE("this will get wrapped", "at this word",
            "and one more long string") -
          111 +
          111)`);
      });

      test('two binary expression lists of different precedence group', () => {
        const query = `
FROM index
| STATS fn(11111111111111.111 + 3333333333333.3333 * 3333333333333.3333 * 3333333333333.3333 * 3333333333333.3333 + 11111111111111.111 + 11111111111111.111)),
| LIMIT 10
`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index
  | STATS
      FN(
        11111111111111.111 +
          3333333333333.3335 *
            3333333333333.3335 *
            3333333333333.3335 *
            3333333333333.3335 +
          11111111111111.111 +
          11111111111111.111)`);
      });

      test('formats WHERE binary-expression', () => {
        const query = `
        FROM index
        | STATS fn(11111111111111 - 11111111111111 - 11111111111111 - 11111111111111) WHERE 11111111111111 == AHA(11111111111111 + 11111111111111 + 11111111111111),
        | LIMIT 10
        `;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
FROM index
  | STATS
      FN(11111111111111 - 11111111111111 - 11111111111111 - 11111111111111) WHERE
        11111111111111 == AHA(11111111111111 + 11111111111111 + 11111111111111)
  | LIMIT 10`);
      });
    });
  });

  describe('inline cast expression', () => {
    test('wraps complex expression into brackets where necessary', () => {
      const query = `
ROW (asdf + asdf)::string, 1.2::string, "1234"::integer, (12321342134 + 2341234123432 + 23423423423 + 234234234 + 234234323423 + 3343423424234234)::integer,
  function_name(123456789 + 123456789 + 123456789 + 123456789 + 123456789 + 123456789 + 123456789, "bbbbbbbbbbbbbb", "aaaaaaaaaaa")::boolean
`;
      const text = reprint(query, { indent: '- ' }).text;

      expect('\n' + text).toBe(`
- ROW
-   (asdf + asdf)::string,
-   1.2::string,
-   "1234"::integer,
-   (12321342134 +
-     2341234123432 +
-     23423423423 +
-     234234234 +
-     234234323423 +
-     3343423424234234)::integer,
-   FUNCTION_NAME(
-     123456789 +
-       123456789 +
-       123456789 +
-       123456789 +
-       123456789 +
-       123456789 +
-       123456789,
-     "bbbbbbbbbbbbbb",
-     "aaaaaaaaaaa")::boolean`);
    });
  });

  describe('list literals', () => {
    describe('numeric', () => {
      test('wraps long list literals one line', () => {
        const query =
          'ROW [1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890]';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  [1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
    1234567890, 1234567890, 1234567890]`);
      });

      test('wraps long list literals to multiple lines one line', () => {
        const query = `ROW [1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
          1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
          1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
          1234567890, 1234567890, 1234567890]`;
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  [1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
    1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
    1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
    1234567890, 1234567890, 1234567890]`);
      });

      test('breaks very long values one-per-line', () => {
        const query = `ROW fn1(fn2(fn3(fn4(fn5(fn6(fn7(fn8([1234567890, 1234567890, 1234567890, 1234567890, 1234567890]))))))))`;
        const text = reprint(query, { wrap: 40 }).text;

        expect('\n' + text).toBe(`
ROW
  FN1(
    FN2(
      FN3(
        FN4(
          FN5(
            FN6(
              FN7(
                FN8(
                  [
                    1234567890,
                    1234567890,
                    1234567890,
                    1234567890,
                    1234567890]))))))))`);
      });
    });

    describe('string', () => {
      test('wraps long list literals one line', () => {
        const query =
          'ROW ["some text", "another text", "one more text literal", "and another one", "and one more", "and one more", "and one more", "and one more", "and one more"]';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  ["some text", "another text", "one more text literal", "and another one",
    "and one more", "and one more", "and one more", "and one more",
    "and one more"]`);
      });

      test('can break very long strings per line', () => {
        const query =
          'ROW ["..............................................", "..............................................", ".............................................."]';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
ROW
  [
    "..............................................",
    "..............................................",
    ".............................................."]`);
      });
    });
  });
});

test.todo('Idempotence on multiple times pretty printing');
