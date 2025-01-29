/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { repeat, uniq } from 'lodash';
import { i18n } from '@kbn/i18n';

const endOfInputText = i18n.translate('esQuery.kql.errors.endOfInputText', {
  defaultMessage: 'end of input',
});

const grammarRuleTranslations: Record<string, string> = {
  fieldName: i18n.translate('esQuery.kql.errors.fieldNameText', {
    defaultMessage: 'field name',
  }),
  value: i18n.translate('esQuery.kql.errors.valueText', {
    defaultMessage: 'value',
  }),
  literal: i18n.translate('esQuery.kql.errors.literalText', {
    defaultMessage: 'literal',
  }),
  whitespace: i18n.translate('esQuery.kql.errors.whitespaceText', {
    defaultMessage: 'whitespace',
  }),
};

const getItemText = (item: KQLSyntaxErrorExpected): string => {
  if (item.type === 'other') {
    return item.description!;
  } else if (item.type === 'literal') {
    return `"${item.text!}"`;
  } else if (item.type === 'end') {
    return 'end of input';
  } else {
    return item.text || item.description || '';
  }
};

interface KQLSyntaxErrorData extends Error {
  found: string;
  expected: KQLSyntaxErrorExpected[] | null;
  location: any;
}

interface KQLSyntaxErrorExpected {
  description?: string;
  text?: string;
  type: string;
}

/**
 * A type of error indicating KQL syntax errors
 * @public
 */
export class KQLSyntaxError extends Error {
  shortMessage: string;

  constructor(error: KQLSyntaxErrorData, expression: any) {
    let message = error.message;
    if (error.expected) {
      const translatedExpectations = error.expected.map((expected) => {
        const key = getItemText(expected);
        return grammarRuleTranslations[key] || key;
      });

      const translatedExpectationText = uniq(translatedExpectations)
        .filter((item) => item !== undefined)
        .sort()
        .join(', ');

      message = i18n.translate('esQuery.kql.errors.syntaxError', {
        defaultMessage: 'Expected {expectedList} but {foundInput} found.',
        values: {
          expectedList: translatedExpectationText,
          foundInput: error.found ? `"${error.found}"` : endOfInputText,
        },
      });
    }

    const fullMessage = [message, expression, repeat('-', error.location.start.offset) + '^'].join(
      '\n'
    );

    super(fullMessage);
    this.name = 'KQLSyntaxError';
    this.shortMessage = message;
  }
}
