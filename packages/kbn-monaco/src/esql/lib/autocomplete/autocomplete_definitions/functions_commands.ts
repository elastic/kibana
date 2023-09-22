/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildDocumentation, buildFunctionDocumentation } from './utils';

import type { AutocompleteCommandDefinition } from '../types';
import { mathCommandFullDefinitions } from '../../definitions/functions';
import { printArguments } from '../../definitions/helpers';
import { FunctionDefinition } from '../../definitions/types';

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

function getMathCommandDefinition({ name, description, signatures }: FunctionDefinition) {
  return {
    label: name,
    insertText: name,
    kind: 1,
    detail: description,
    documentation: {
      value: buildFunctionDocumentation(
        signatures.map(({ params, returnType, infiniteParams, examples }) => ({
          declaration: `${name}(${params.map(printArguments).join(', ')}${
            infiniteParams ? ` ,[... ${params.map(printArguments)}]` : ''
          }): ${returnType}`,
          examples,
        }))
      ),
    },
    sortText: 'C',
  };
}

export const mathCommandDefinition: AutocompleteCommandDefinition[] =
  mathCommandFullDefinitions.map(getMathCommandDefinition);

export const getCompatibleMathCommandDefinition = (
  returnTypes?: string[]
): AutocompleteCommandDefinition[] => {
  if (!returnTypes) {
    return mathCommandDefinition;
  }
  return mathCommandFullDefinitions
    .filter((mathDefinition) =>
      mathDefinition.signatures.some((signature) => returnTypes.includes(signature.returnType))
    )
    .map(getMathCommandDefinition);
};

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
