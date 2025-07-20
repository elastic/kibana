/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/validation';
import { mockContext } from '../../../__tests__/context_fixtures';

const completionExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'completion', validate);
};

describe('COMPLETION Validation', () => {
  describe('COMPLETION <prompt>...', () => {
    describe('valid uses with no errors', () => {
      it('prompt is a constant text', () => {
        completionExpectErrors(
          'FROM index | COMPLETION "Write an opinion about ES|QL" WITH inferenceId',
          []
        );
      });

      it('prompt is a function that returns text', () => {
        completionExpectErrors(
          'FROM index | COMPLETION CONCAT("Write an opinion about ", "ES|QL") WITH inferenceId',
          []
        );

        completionExpectErrors(
          `FROM index
         | EVAL var0 = 1
         | COMPLETION CASE(
           var0 == 0, "Is today Monday?",
           var0 == 1, "Is today Tuesday?"
         ) WITH inferenceId`,
          []
        );
      });

      it('prompt is a text column', () => {
        completionExpectErrors(
          'FROM index | EVAL prompt = "Write an opinion about ES|QL" | COMPLETION prompt WITH inferenceId',
          []
        );

        completionExpectErrors(
          `FROM index | EVAL prompt = CONCAT("Write an opinion about ", "ES|QL") | COMPLETION prompt WITH inferenceId`,
          []
        );

        completionExpectErrors(
          `FROM index
         | EVAL var0 = 1
         | COMPLETION CASE(
           var0 == 0, "Is today Monday?",
           var0 == 1, "Is today Tuesday?"
         ) WITH inferenceId`,
          []
        );

        completionExpectErrors(
          'FROM index | RENAME keywordField AS renamedField | COMPLETION renamedField WITH inferenceId',
          []
        );

        completionExpectErrors(`FROM index | COMPLETION keywordField WITH inferenceId`, []);
      });

      it('prompt is a parameter', () => {
        completionExpectErrors(`FROM index | COMPLETION ?named_param WITH inferenceId`, []);
        completionExpectErrors(`FROM index | COMPLETION ?123 WITH inferenceId`, []);
        completionExpectErrors(`FROM index | COMPLETION ? WITH inferenceId`, []);
      });

      it('prompt is a text parenthesized expression', () => {
        completionExpectErrors(
          `FROM index | COMPLETION ("Write an opinion about ES|QL") WITH inferenceId`,
          []
        );
        completionExpectErrors(
          `FROM index | COMPLETION (CONCAT("Write an opinion about ", "ES|QL")) WITH inferenceId`,
          []
        );
      });
    });

    describe('incorrect uses with type errors', () => {
      it('prompt is a constant, but not text', async () => {
        await completionExpectErrors(`FROM index | COMPLETION 47 WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [integer]',
        ]);

        await completionExpectErrors(`FROM index | COMPLETION true WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [boolean]',
        ]);
      });

      it('prompt is a function, but does not return text', async () => {
        await completionExpectErrors(`FROM index | COMPLETION PI() WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [double]',
        ]);

        await completionExpectErrors(
          `FROM index
                    | EVAL var0 = 1
                    | COMPLETION CASE(
                      var0 == 0, 2,
                      var0 == 1, 1
                    ) WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [integer]']
        );

        await completionExpectErrors(
          `FROM index | COMPLETION TO_DATETIME("2023-12-02T11:00:00.000Z") WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [date]']
        );

        await completionExpectErrors(`FROM index | COMPLETION AVG(integerField) WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [double]',
          'COMPLETION does not support function avg',
        ]);
      });

      it('prompt is a column, but not a text one', () => {
        completionExpectErrors(
          `FROM index | EVAL integerPrompt = 47 | COMPLETION integerPrompt WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [integer]']
        );
        completionExpectErrors(
          `FROM index | EVAL ipPrompt = to_ip("1.2.3.4") | COMPLETION ipPrompt WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [ip]']
        );
        completionExpectErrors(`FROM index | COMPLETION dateField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [date]',
        ]);
        completionExpectErrors(`FROM index | COMPLETION counterIntegerField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [counter_integer]',
        ]);
      });

      it('prompt is an unknown field', () => {
        completionExpectErrors(`FROM index | COMPLETION unknownField WITH inferenceId`, [
          'Unknown column [unknownField]',
        ]);
        completionExpectErrors(`FROM index | COMPLETION \`unknownField\` WITH inferenceId`, [
          'Unknown column [unknownField]',
        ]);
      });

      it('prompt is a parenthesized expression, but not a text one', () => {
        completionExpectErrors(`FROM index | COMPLETION (1 > 2) WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [boolean]',
        ]);
      });
    });

    describe('COMPLETION <targetField> = <prompt>...', () => {
      describe('if no targetField provided, the default targetField is `completion`', () => {
        it('completion field is available after completion command', () => {
          completionExpectErrors(
            `FROM index | COMPLETION "prompt" WITH inferenceId | KEEP completion`,
            []
          );
        });
      });

      describe('a custom targetField is provided', () => {
        it('targetField is not available before COMPLETION', () => {
          completionExpectErrors(
            `FROM index | KEEP customField | COMPLETION customField = "prompt" WITH inferenceId`,
            ['Unknown column [customField]']
          );
        });

        it('targetField is available after COMPLETION', () => {
          completionExpectErrors(
            `FROM index | COMPLETION keywordField = "prompt" WITH inferenceId | KEEP keywordField`,
            []
          );
        });
      });
    });
  });
});
