/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildDocumentation } from './utils';

import type { AutocompleteCommandDefinition } from '../types';

export const whereCommandDefinition: AutocompleteCommandDefinition[] = [
  {
    label: 'cidr_match',
    insertText: 'cidr_match',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.cidrMatchDoc', {
      defaultMessage:
        'The function takes a first parameter of type IP, followed by one or more parameters evaluated to a CIDR specificatione.',
    }),
    documentation: {
      value: buildDocumentation('cidr_match(grouped[T]): aggregated[T]', [
        'from index | eval cidr="10.0.0.0/8" | where cidr_match(ip_field, "127.0.0.1/30", cidr)',
      ]),
    },
    sortText: 'C',
  },
];

export const mathCommandDefinition: AutocompleteCommandDefinition[] = [
  {
    label: 'round',
    insertText: 'round',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.roundDoc', {
      defaultMessage:
        'Returns a number rounded to the decimal, specified by he closest integer value. The default is to round to an integer.',
    }),
    documentation: {
      value: buildDocumentation('round(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval rounded = round(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'abs',
    insertText: 'abs',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.absDoc', {
      defaultMessage: 'Returns the absolute value.',
    }),
    documentation: {
      value: buildDocumentation('abs(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval abs_value = abs(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'pow',
    insertText: 'pow',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.powDoc', {
      defaultMessage:
        'Returns the the value of a base (first argument) raised to a power (second argument).',
    }),
    documentation: {
      value: buildDocumentation('pow(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval s = POW(field, exponent)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'log10',
    insertText: 'log10',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.log10Doc', {
      defaultMessage: 'Returns the log base 10.',
    }),
    documentation: {
      value: buildDocumentation('log10(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval s = log10(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'concat',
    insertText: 'concat',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.concatDoc', {
      defaultMessage: 'Concatenates two or more strings.',
    }),
    documentation: {
      value: buildDocumentation('concat(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval concatenated = concat(field1, "-", field2)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'substring',
    insertText: 'substring',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.substringDoc', {
      defaultMessage:
        'Returns a substring of a string, specified by a start position and an optional length. This example returns the first three characters of every last name.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval new_string = substring(field, 1, 3)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'trim',
    insertText: 'trim',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.trimDoc', {
      defaultMessage: 'Removes leading and trailing whitespaces from strings.',
    }),
    documentation: {
      value: buildDocumentation('trim(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval new_string = trim(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'starts_with',
    insertText: 'starts_with',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.startsWithDoc', {
      defaultMessage:
        'Returns a boolean that indicates whether a keyword string starts with another string.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval new_string = starts_with(field, "a")',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'split',
    insertText: 'split',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.splitDoc', {
      defaultMessage: 'Splits a single valued string into multiple strings.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `ROW words="foo;bar;baz;qux;quux;corge"
        | EVAL word = SPLIT(words, ";")`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_string',
    insertText: 'to_string',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toStringDoc', {
      defaultMessage: 'Converts to string.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL string = to_string(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_boolean',
    insertText: 'to_boolean',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toBooleanDoc', {
      defaultMessage: 'Converts to boolean.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL bool = to_boolean(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_datetime',
    insertText: 'to_datetime',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toDateTimeDoc', {
      defaultMessage: 'Converts to date.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL datetime = to_datetime(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_double',
    insertText: 'to_double',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toDoubleDoc', {
      defaultMessage: 'Converts to double.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL double = to_double(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_integer',
    insertText: 'to_integer',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toIntegerDoc', {
      defaultMessage: 'Converts to integer.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL int = to_integer(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_long',
    insertText: 'to_long',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toLongDoc', {
      defaultMessage: 'Converts to long.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL long = to_long(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_unsigned_long',
    insertText: 'to_unsigned_long',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toUnsignedLongDoc', {
      defaultMessage: 'Converts to unsigned long.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL long = to_unsigned_long(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_ip',
    insertText: 'to_ip',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toIpDoc', {
      defaultMessage: 'Converts to ip.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL ip = to_ip(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'to_version',
    insertText: 'to_version',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.toVersionDoc', {
      defaultMessage: 'Converts to version.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value""
        | EVAL version = to_version(field)`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'date_format',
    insertText: 'date_format',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.dateFormatDoc', {
      defaultMessage: `Returns a string representation of a date in the provided format. If no format is specified, the "yyyy-MM-dd'T'HH:mm:ss.SSSZ" format is used.`,
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval hired = date_format(hire_date, "YYYY-MM-dd")',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'date_trunc',
    insertText: 'date_trunc',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.dateTruncDoc', {
      defaultMessage: `Rounds down a date to the closest interval.`,
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval year_hired = DATE_TRUNC(hire_date, 1 year)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'date_parse',
    insertText: 'date_parse',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.dateParseDoc', {
      defaultMessage: `Parse dates from strings.`,
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value" | eval year_hired = date_parse(hire_date, yyyy-MM-dd'T'HH:mm:ss.SSS'Z')`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'auto_bucket',
    insertText: 'auto_bucket',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.autoBucketDoc', {
      defaultMessage: `Automatically bucket dates based on a given range and bucket target.`,
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval hd = auto_bucket(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'is_finite',
    insertText: 'is_finite',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.isFiniteDoc', {
      defaultMessage: 'Returns a boolean that indicates whether its input is a finite number.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval s = is_finite(field/0)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'is_infinite',
    insertText: 'is_infinite',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.isInfiniteDoc', {
      defaultMessage: 'Returns a boolean that indicates whether its input is infinite.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        'from index where field="value" | eval s = is_infinite(field/0)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'case',
    insertText: 'case',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.caseDoc', {
      defaultMessage:
        'Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to `true`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value" | eval type = case(
          languages <= 1, "monolingual",
          languages <= 2, "bilingual",
           "polyglot")`,
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'length',
    insertText: 'length',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.lengthDoc', {
      defaultMessage: 'Returns the character length of a string.',
    }),
    documentation: {
      value: buildDocumentation('substring(grouped[T]): aggregated[T]', [
        `from index where field="value" | eval fn_length = length(field)`,
      ]),
    },
    sortText: 'C',
  },
];

export const aggregationFunctionsDefinitions: AutocompleteCommandDefinition[] = [
  {
    label: 'avg',
    insertText: 'avg',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.avgDoc', {
      defaultMessage: 'Returns the average of the values in a field',
    }),
    documentation: {
      value: buildDocumentation('avg(grouped[T]): aggregated[T]', [
        'from index | stats average = avg(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'max',
    insertText: 'max',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.maxDoc', {
      defaultMessage: 'Returns the maximum value in a field.',
    }),
    documentation: {
      value: buildDocumentation('max(grouped[T]): aggregated[T]', [
        'from index | stats max = max(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'min',
    insertText: 'min',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.minDoc', {
      defaultMessage: 'Returns the minimum value in a field.',
    }),
    documentation: {
      value: buildDocumentation('min(grouped[T]): aggregated[T]', [
        'from index | stats min = min(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'sum',
    insertText: 'sum',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
    documentation: {
      value: buildDocumentation('sum(grouped[T]): aggregated[T]', [
        'from index | stats sum = sum(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'count',
    insertText: 'count',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.countDoc', {
      defaultMessage: 'Returns the count of the values in a field.',
    }),
    documentation: {
      value: buildDocumentation('count(grouped[T]): aggregated[T]', [
        'from index | stats count = count(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'count_distinct',
    insertText: 'count_distinct',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.countDistinctDoc', {
      defaultMessage: 'Returns the count of distinct values in a field.',
    }),
    documentation: {
      value: buildDocumentation('count(grouped[T]): aggregated[T]', [
        'from index | stats count = count_distinct(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'median',
    insertText: 'median',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.medianDoc', {
      defaultMessage: 'Returns the 50% percentile.',
    }),
    documentation: {
      value: buildDocumentation('count(grouped[T]): aggregated[T]', [
        'from index | stats count = median(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'median_absolute_deviation',
    insertText: 'median_absolute_deviation',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.medianDeviationDoc', {
      defaultMessage:
        'Returns the median of each data point’s deviation from the median of the entire sample.',
    }),
    documentation: {
      value: buildDocumentation('count(grouped[T]): aggregated[T]', [
        'from index | stats count = median_absolute_deviation(field)',
      ]),
    },
    sortText: 'C',
  },
  {
    label: 'percentile',
    insertText: 'percentile',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.percentiletDoc', {
      defaultMessage: 'Returns the n percentile of a field.',
    }),
    documentation: {
      value: buildDocumentation('percentile(grouped[T]): aggregated[T]', [
        'from index | stats pct = percentile(field, 90)',
      ]),
    },
    sortText: 'C',
  },
];
