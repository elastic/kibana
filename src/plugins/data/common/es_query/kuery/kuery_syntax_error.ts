/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { repeat } from 'lodash';
import { i18n } from '@kbn/i18n';

const endOfInputText = i18n.translate('data.common.kql.errors.endOfInputText', {
  defaultMessage: 'end of input',
});

const grammarRuleTranslations: Record<string, string> = {
  fieldName: i18n.translate('data.common.kql.errors.fieldNameText', {
    defaultMessage: 'field name',
  }),
  value: i18n.translate('data.common.kql.errors.valueText', {
    defaultMessage: 'value',
  }),
  literal: i18n.translate('data.common.kql.errors.literalText', {
    defaultMessage: 'literal',
  }),
  whitespace: i18n.translate('data.common.kql.errors.whitespaceText', {
    defaultMessage: 'whitespace',
  }),
};

interface KQLSyntaxErrorData extends Error {
  found: string;
  expected: KQLSyntaxErrorExpected[] | null;
  location: any;
}

interface KQLSyntaxErrorExpected {
  description: string;
}

export class KQLSyntaxError extends Error {
  shortMessage: string;

  constructor(error: KQLSyntaxErrorData, expression: any) {
    let message = error.message;
    if (error.expected) {
      const translatedExpectations = error.expected.map((expected) => {
        return grammarRuleTranslations[expected.description] || expected.description;
      });

      const translatedExpectationText = translatedExpectations.join(', ');

      message = i18n.translate('data.common.kql.errors.syntaxError', {
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
