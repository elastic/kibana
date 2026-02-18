/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../parser';
import type { ESQLMap } from '../../types';
import { Walker } from '../../ast/walker';
import type { WrappingPrettyPrinterOptions } from '../wrapping_pretty_printer';
import { WrappingPrettyPrinter } from '../wrapping_pretty_printer';

const reprint = (src: string, opts?: WrappingPrettyPrinterOptions) => {
  const { root } = parse(src);
  const text = WrappingPrettyPrinter.print(root, opts);

  // console.log(JSON.stringify(root.commands, null, 2));

  return { text };
};

const assertReprint = (src: string, expected: string = src) => {
  const { text } = reprint(src);

  expect(text).toBe(expected);
};

describe('commands', () => {
  describe('header commands', () => {
    describe('SET', () => {
      test('single SET command with short query', () => {
        const { text } = reprint('SET timeout = "30s"; FROM index');

        expect(text).toBe('SET timeout = "30s";\nFROM index');
      });

      test('multiple SET commands with short query', () => {
        const { text } = reprint(
          'SET timeout = "30s"; SET max_results = 100; FROM index | LIMIT 10'
        );

        expect('\n' + text).toBe(`
SET timeout = "30s";
SET max_results = 100;
FROM index | LIMIT 10`);
      });

      test('SET command with long query wraps correctly', () => {
        const { text } = reprint(
          'SET timeout = "30s"; FROM very_long_index_name_that_exceeds_line_length | WHERE very_long_field_name == "value" | LIMIT 100'
        );

        expect('\n' + text).toBe(`
SET timeout = "30s";
FROM very_long_index_name_that_exceeds_line_length
  | WHERE very_long_field_name == "value"
  | LIMIT 100`);
      });

      test('multiple SET commands with long query', () => {
        const { text } = reprint(
          'SET timeout = "30s"; SET max_results = 1000; FROM very_long_index_name_that_exceeds_line_length | WHERE field == "value"'
        );

        expect('\n' + text).toBe(`
SET timeout = "30s";
SET max_results = 1000;
FROM very_long_index_name_that_exceeds_line_length | WHERE field == "value"`);
      });

      test('SET with keyword identifier', () => {
        const { text } = reprint('SET key = "value"; FROM index');

        expect(text).toBe('SET `key` = "value";\nFROM index');
      });

      test('SET with numeric value', () => {
        const { text } = reprint('SET max_results = 500; FROM index');

        expect(text).toBe('SET max_results = 500;\nFROM index');
      });

      test('SET with boolean value', () => {
        const { text } = reprint('SET debug = true; FROM index');

        expect(text).toBe('SET debug = TRUE;\nFROM index');
      });
    });
  });

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

    test('supports binary expressions', () => {
      assertReprint(
        `FROM employees
  | LEFT JOIN asdf
        ON
          aaaaaaaaaaaaaaaaaaaaaaaaa > bbbbbbbbbbbbbbbbbbbbb AND
            ccccccccccccccccccc == dddddddddddddddddddddddddddddddddddddddd`
      );
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

  describe('CHANGE_POINT', () => {
    test('value only', () => {
      const { text } = reprint(`FROM a | CHANGE_POINT value`);

      expect(text).toBe('FROM a | CHANGE_POINT value');
    });

    test('value and key', () => {
      const { text } = reprint(`FROM a | CHANGE_POINT value ON key`);

      expect(text).toBe('FROM a | CHANGE_POINT value ON `key`');
    });

    test('value and target', () => {
      const { text } = reprint(`FROM a | CHANGE_POINT value AS type, pvalue`);

      expect(text).toBe('FROM a | CHANGE_POINT value AS type, pvalue');
    });

    test('value, key, and target', () => {
      const { text } = reprint(`FROM a | CHANGE_POINT value ON key AS type, pvalue`);

      expect(text).toBe('FROM a | CHANGE_POINT value ON `key` AS type, pvalue');
    });

    test('example from docs', () => {
      const { text } = reprint(`
        FROM k8s
          | STATS count=COUNT() BY @timestamp=BUCKET(@timestamp, 1 MINUTE)
          | CHANGE_POINT count ON @timestamp AS type, pvalue
          | LIMIT 123
      `);

      expect(text).toBe(
        `FROM k8s
  | STATS count = COUNT()
        BY @timestamp = BUCKET(@timestamp, 1 MINUTE)
  | CHANGE_POINT count
        ON @timestamp
        AS type, pvalue
  | LIMIT 123`
      );
    });
  });

  describe('RERANK', () => {
    test('default example', () => {
      const { text } = reprint(`FROM a | RERANK "query" ON field1 WITH {"inference_id": "model"}`);

      expect(text).toBe('FROM a | RERANK "query" ON field1 WITH {"inference_id": "model"}');
    });

    test('wraps long query', () => {
      const { text } = reprint(
        `FROM a | RERANK "this is a very long long long long long long long long long long long long text" ON field1 WITH {"inference_id": "model"}`
      );

      expect(text).toBe(`FROM a
  | RERANK
      "this is a very long long long long long long long long long long long long text"
        ON field1
        WITH {"inference_id": "model"}`);
    });

    test('two fields', () => {
      const { text } = reprint(
        `FROM a | RERANK "query" ON field1,field2 WITH {"inference_id": "model"}`
      );

      expect(text).toBe('FROM a | RERANK "query" ON field1, field2 WITH {"inference_id": "model"}');
    });

    test('wraps many fields', () => {
      const { text } = reprint(
        `FROM a | RERANK "query" ON field1,field2,field3,field4,field5,field6,field7,field8,field9,field10,field11,field12 WITH {"inference_id": "model"}`
      );
      expect(text).toBe(`FROM a
  | RERANK "query"
        ON field1, field2, field3, field4, field5, field6, field7, field8, field9,
          field10, field11, field12
        WITH {"inference_id": "model"}`);
    });
  });

  describe('MMR', () => {
    test('with query vector', () => {
      const { text } = reprint(
        'FROM a | MMR [0.5,0.4,0.3,0.2]::dense_vector ON genre LIMIT 10 WITH {"lambda": 0.5}'
      );

      expect(text).toBe(
        `FROM a
  | MMR ([0.5, 0.4, 0.3, 0.2])::DENSE_VECTOR
        ON genre
        LIMIT 10
        WITH {"lambda": 0.5}`
      );
    });
  });

  describe('FORK', () => {
    test('basic fork with simple subqueries', () => {
      const { text } = reprint('FROM index | FORK ( KEEP a ) ( KEEP b )');

      expect(text).toBe('FROM index | FORK (KEEP a) (KEEP b)');
    });

    test('fork with longer subqueries', () => {
      const { text } = reprint(
        'FROM index | FORK ( KEEP field1, field2, field3 | WHERE x > 100 ) ( DROP field4, field5 | LIMIT 50 )',
        { multiline: true }
      );

      expect(text).toBe(`FROM index
  | FORK
      (
          KEEP field1, field2, field3
        | WHERE x > 100
      )
      (
          DROP field4, field5
        | LIMIT 50
      )`);
    });

    test('fork with multiple complex subqueries', () => {
      const { text } = reprint(
        'FROM index | FORK ( STATS count=COUNT() BY category | WHERE count > 10 | SORT count DESC ) ( KEEP name, value | WHERE value IS NOT NULL | LIMIT 100 )',
        { multiline: true }
      );

      expect(text).toBe(`FROM index
  | FORK
      (
          STATS count = COUNT()
          BY category
        | WHERE count > 10
        | SORT count DESC
      )
      (
          KEEP name, value
        | WHERE value IS NOT NULL
        | LIMIT 100
      )`);
    });

    test('fork with commands before and after it', () => {
      const { text } = reprint(
        'FROM index | DROP a | FORK ( KEEP field1 | WHERE x > 100 ) ( DROP field2 | LIMIT 50 ) | LIMIT 100',
        { multiline: true }
      );

      expect(text).toBe(`FROM index
  | DROP a
  | FORK
      (
          KEEP field1
        | WHERE x > 100
      )
      (
          DROP field2
        | LIMIT 50
      )
  | LIMIT 100`);
    });

    test('fork with a very long command within', () => {
      const { text } = reprint(
        'FROM index | FORK ( WHERE x > 100 | KEEP field1, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd) (LIMIT 10)',
        { multiline: true }
      );

      expect(text).toBe(`FROM index
  | FORK
      (
          WHERE x > 100
        | KEEP field1, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd, asd,
            asd, asd, asd, asd, asd, asd, asd
      )
      (
          LIMIT 10
      )`);
    });
  });

  describe('PROMQL', () => {
    test('realistic command', () => {
      const src =
        'PROMQL step = "5m" start = ?_tstart end = ?_tend index = kibana_sample_data_logstsdb col0 = (sum(avg(quantile_over_time(0.9,bytes{event.dataset="job"}[5m]))))';
      const { text } = reprint(src);

      expect('\n' + text).toBe(`
PROMQL
  step = "5m" start = ?_tstart end = ?_tend index = kibana_sample_data_logstsdb
  col0 = (sum(avg(quantile_over_time(0.9,bytes{event.dataset="job"}[5m]))))`);
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

  test('parameter function name is printed as specified', () => {
    const text = reprint('ROW ??functionName(*)').text;

    expect(text).toBe('ROW ??functionName(*)');
  });

  test('parameter function name is printed as specified (single ?)', () => {
    const text = reprint('ROW ?functionName(42)').text;

    expect(text).toBe('ROW ?functionName(42)');
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

  describe('map expression', () => {
    describe('bare map', () => {
      test('with initial indentation', () => {
        const query = 'PROMQL a = b c = d e = f g = (query)';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
PROMQL a = b c = d e = f g = (query)`);
      });
    });
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
| STATS super_function_name(0.123123123123123 + 888811112.232323123123 + 123123123123.123123123 + 23232323.23232323123 - 123 + 999),
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
          999)
  | LIMIT 10`);
    });
  });

  describe('map expression', () => {
    test('empty map', () => {
      const src = `ROW F(0, {"a": 0})`;
      const { root } = parse(src);
      const map = Walker.match(root, { type: 'map' }) as ESQLMap;

      map.entries = [];

      const text = WrappingPrettyPrinter.print(root);

      expect(text).toBe(`ROW F(0, {})`);
    });

    test('supports nested maps', () => {
      assertReprint('ROW FN(1, {"foo": "bar", "baz": {"a": 1, "b": 2}})');
    });

    test('empty map (multiline)', () => {
      const src = `ROW F(0, {"a": 0}) | LIMIT 1`;
      const { root } = parse(src);
      const map = Walker.match(root, { type: 'map' }) as ESQLMap;

      map.entries = [];

      const text = WrappingPrettyPrinter.print(root, { multiline: true });

      expect(text).toBe(`ROW F(0, {})
  | LIMIT 1`);
    });

    test('single entry map', () => {
      const src = `ROW F(0, {"a": 0})`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW F(0, {"a": 0})`);
    });

    test('single entry map (multiline)', () => {
      const src = `ROW F(0, {"a": 0}) | LIMIT 1`;
      const text = reprint(src, { multiline: true }).text;

      expect(text).toBe(`ROW F(0, {"a": 0})\n  | LIMIT 1`);
    });

    test('two entry map', () => {
      const src = `ROW F(0, {"a": 0, "b": 1})`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW F(0, {"a": 0, "b": 1})`);
    });

    test('many small map entries', () => {
      const src = `ROW FUNCTION(123456789, {"abc1": 123, "abc2": 123, "abc3": 123, "abc4": 123, "abc5": 123, "abc6": 123, "abc7": 123, "abc8": 123, "abc9": 123})`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {"abc1": 123, "abc2": 123, "abc3": 123, "abc4": 123, "abc5": 123, "abc6": 123,
      "abc7": 123, "abc8": 123, "abc9": 123})`);
    });

    test('one long map entry', () => {
      const src = `ROW FUNCTION(123456789, {
        "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz"
      })`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {"abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz"})`);
    });

    test('couple long map entries', () => {
      const src = `ROW FUNCTION(123456789, {
        "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz-2": "abcdefghijklmnopqrstuvwxyz"
      })`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {
      "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz-2": "abcdefghijklmnopqrstuvwxyz"
    })`);
    });

    test('few long map entries', () => {
      const src = `ROW FUNCTION(123456789, {
        "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz-2": "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz-3": "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz-4": ["abcdefghijklmnopqrstuvwxyz", "abcdefghijklmnopqrstuvwxyz", "abcdefghijklmnopqrstuvwxyz"]})`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {
      "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz-2": "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz-3": "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz-4":
        ["abcdefghijklmnopqrstuvwxyz", "abcdefghijklmnopqrstuvwxyz",
          "abcdefghijklmnopqrstuvwxyz"]
    })`);
    });

    test('can break up large map entries into two lines', () => {
      const src = `ROW FUNCTION(123456789, {
        "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
        "abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-2": "abcdefghijklmnopqrstuvwxyz"
      })`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {
      "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
      "abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-2":
        "abcdefghijklmnopqrstuvwxyz"
    })`);
    });

    test('can break up large map entries into two lines when key is long', () => {
      const src = `ROW FUNCTION(123456789, {
        "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
        "abc": "abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz"
      })`;
      const text = reprint(src).text;

      expect(text).toBe(`ROW
  FUNCTION(
    123456789,
    {
      "abcdefghijklmnopqrstuvwxyz-1": "abcdefghijklmnopqrstuvwxyz",
      "abc":
        "abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz"
    })`);
    });

    test('supports wrapping in nested maps', () => {
      assertReprint(
        `ROW
  FN(
    1,
    {
      "map":
        {
          "aaaaaaaaaaaaaaaaaaaaa": 111111111111111,
          "bbbbbbbbbbbbbbbbbbbbbbbb": 222222222222222
        }
    })`
      );
    });

    describe('representation: assignment', () => {
      test('single entry assignment map', () => {
        const src = `PROMQL index = my_index bytes[5m]`;
        const text = reprint(src).text;

        expect(text).toBe(`PROMQL index = my_index bytes[5m]`);
      });

      test('multiple entry assignment map', () => {
        const src = `PROMQL index = my_index time = ?param bytes[5m]`;
        const text = reprint(src).text;

        expect(text).toBe(`PROMQL index = my_index time = ?param bytes[5m]`);
      });

      test('assignment map with long values wraps correctly', () => {
        const src = `PROMQL index = my_very_long_index_name_that_should_wrap time = ?param bytes[5m]`;
        const text = reprint(src, { wrap: 60 }).text;

        expect(text).toBe(`PROMQL
    index = my_very_long_index_name_that_should_wrap
    time = ?param
  bytes[5m]`);
      });

      test('long query', () => {
        const src = `PROMQL index = kibana_sample_data_logstsdb step = ?_step start = ?_something_very_very_long_to_force_wrapping end = ?_end rate(byres_counter[5m])`;
        const text = reprint(src, { wrap: 60 }).text;

        expect(text).toBe(
          `PROMQL
    index = kibana_sample_data_logstsdb
    step = ?_step
    start = ?_something_very_very_long_to_force_wrapping
    end = ?_end
  rate(byres_counter[5m])`
        );
      });

      test.skip('strings and duration in PROMQL command', () => {
        const src = `PROMQL index = kibana_sample_data_logstsdb step = 5m start = "2026-01-08T19:30:00.000Z" end = ?_end rate(byres_counter[5m])`;
        const text = reprint(src, { wrap: 60 }).text;

        expect(text).toBe(
          `PROMQL
    index = kibana_sample_data_logstsdb
    step = 5m
    start = "2026-01-08T19:30:00.000Z"
    end = ?_end
  rate(byres_counter[5m])`
        );
      });
    });

    describe('bare map', () => {
      test('wrapped', () => {
        const query =
          'PROMQL key1 = value1 key2 = value2 key3 = value3 query_name = (some_very_very_very_long_query_that_will_force_wrapping)';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
PROMQL
  key1 = value1 key2 = value2 key3 = value3
  query_name = (some_very_very_very_long_query_that_will_force_wrapping)`);
      });

      test('broken down by line', () => {
        const query =
          'PROMQL key1 = value1 key2 = value2 key3 = value3 key4 = value4 key5 = value5 key6 = value6 key7 = value7 query_name = (query)';
        const text = reprint(query).text;

        expect('\n' + text).toBe(`
PROMQL
    key1 = value1
    key2 = value2
    key3 = value3
    key4 = value4
    key5 = value5
    key6 = value6
    key7 = value7
  query_name = (query)`);
      });
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
| STATS fn(123456789 + 123456789 - 123456789 + 123456789 - 123456789 + 123456789 - 123456789),
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
          123456789)
  | LIMIT 10`);
      });

      test('binary expressions vertical flattening child function function argument wrapping', () => {
        const query = `
FROM index
| STATS super_function_name(11111111111111.111 + 11111111111111.111 * 11111111111111.111 + another_function_goes_here("this will get wrapped", "at this word", "and one more long string") - 111 + 111),
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
          111)
  | LIMIT 10`);
      });

      test('two binary expression lists of different precedence group', () => {
        const query = `
FROM index
| STATS fn(11111111111111.111 + 3333333333333.3333 * 3333333333333.3333 * 3333333333333.3333 * 3333333333333.3333 + 11111111111111.111 + 11111111111111.111),
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
          11111111111111.111)
  | LIMIT 10`);
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
                    1234567890
                  ]))))))))`);
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
    ".............................................."
  ]`);
      });
    });
  });

  describe('list tuples', () => {
    test('wraps long lists over one line', () => {
      const query =
        'FROM a | WHERE b in (1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890)';
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM a
  | WHERE
      b IN
        (1234567890, 1234567890, 1234567890, 1234567890, 1234567890, 1234567890,
          1234567890, 1234567890, 1234567890)`);
    });

    test('breaks lists with long items', () => {
      const query =
        'FROM a | WHERE b not in ("abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz", "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz", "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz")';
      const text = reprint(query).text;

      expect('\n' + text).toBe(`
FROM a
  | WHERE
      b NOT IN
        (
          "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
          "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
          "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
        )`);
    });
  });
});

describe('unary operator precedence and grouping', () => {
  test('NOT should not parenthesize literals', () => {
    assertReprint('ROW NOT a');
    assertReprint(
      `FROM a
  | STATS
      NOT aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
    );
  });

  test('NOT should not parenthesize literals unnecessarily', () => {
    assertReprint('ROW NOT (a)', 'ROW NOT a');
  });

  test('NOT should parenthesize OR expressions', () => {
    assertReprint(
      `ROW
  NOT (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa OR
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)`
    );
  });

  test('NOT should parenthesize AND expressions', () => {
    assertReprint(
      `ROW
  NOT (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AND
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)`
    );
  });

  test('NOT should not parenthesize expressions with higher precedence', () => {
    assertReprint(
      `ROW
  NOT (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa >
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)`,
      `ROW
  NOT aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa >
    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`
    );
  });

  test('NOT should parenthesize OR expressions on the right side', () => {
    assertReprint(
      `ROW
  NOT aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa OR
    NOT (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ==
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa OR
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ==
        aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)`
    );
  });

  test('unary minus should parenthesize addition', () => {
    assertReprint(
      `ROW
  -2 *
    (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa +
      bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb)`
    );
  });
});

describe('subqueries (parens)', () => {
  test('can print complex subqueries with processing', () => {
    const src =
      'FROM index1, (FROM index2 | WHERE a > 10 | EVAL b = a * 2 | STATS cnt = COUNT(*) BY c | SORT cnt DESC | LIMIT 10), index3, (FROM index4 | STATS count(*)) | WHERE d > 10 | STATS max = max(*) BY e | SORT max DESC';

    assertReprint(
      src,
      `FROM
  index1,
  (FROM index2
    | WHERE a > 10
    | EVAL b = a * 2
    | STATS cnt = COUNT(*)
          BY c
    | SORT cnt DESC
    | LIMIT 10),
  index3,
  (FROM index4 | STATS COUNT(*))
  | WHERE d > 10
  | STATS max = MAX(*)
        BY e
  | SORT max DESC`
    );
  });
});

test.todo('Idempotence on multiple times pretty printing');
