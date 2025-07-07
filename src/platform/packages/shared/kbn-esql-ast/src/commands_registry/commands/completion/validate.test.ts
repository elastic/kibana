/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '../../../parser';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import { validate } from './validate';

export const expectErrors = (query: string, expectedErrors: string[]) => {
  const context = {
    userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([]),
    fields: new Map<string, ESQLFieldWithMetadata>([
      ['field1', { name: 'field1', type: 'keyword' }],
      ['count', { name: 'count', type: 'double' }],
    ]),
  };
  const { root } = Parser.parse(query);
  const completionCommand = root.commands.find((cmd) => cmd.name === 'completion');
  if (!completionCommand) {
    throw new Error('COMPLETION command not found in the parsed query');
  }
  const result = validate(completionCommand, root.commands, context);

  const errors: string[] = [];
  result.forEach((error) => {
    errors.push(error.text);
  });
  expect(errors).toEqual(expectedErrors);
};

describe('COMPLETION Validation', () => {
  describe('COMPLETION <prompt>...', () => {
    describe('valid uses with no errors', () => {
      it('prompt is a constant text', () => {
        expectErrors('FROM index | COMPLETION "Write an opinion about ES|QL" WITH inferenceId', []);
      });

      it('prompt is a function that returns text', () => {
        expectErrors(
          'FROM index | COMPLETION CONCAT("Write an opinion about ", "ES|QL") WITH inferenceId',
          []
        );

        expectErrors(
          `FROM index
         | EVAL day_of_week_i = 1
         | COMPLETION CASE(
           day_of_week_i == 0, "Is today Monday?",
           day_of_week_i == 1, "Is today Tuesday?"
         ) WITH inferenceId`,
          []
        );
      });

      it('prompt is a text column', () => {
        expectErrors(
          'FROM index | EVAL prompt = "Write an opinion about ES|QL" | COMPLETION prompt WITH inferenceId',
          []
        );

        expectErrors(
          `FROM index | EVAL prompt = CONCAT("Write an opinion about ", "ES|QL") | COMPLETION prompt WITH inferenceId`,
          []
        );

        expectErrors(
          `FROM index
         | EVAL day_of_week_i = 1
         | COMPLETION CASE(
           day_of_week_i == 0, "Is today Monday?",
           day_of_week_i == 1, "Is today Tuesday?"
         ) WITH inferenceId`,
          []
        );

        expectErrors(
          'FROM index | RENAME textField AS renamedField | COMPLETION renamedField WITH inferenceId',
          []
        );

        expectErrors(`FROM index | COMPLETION textField WITH inferenceId`, []);
        expectErrors(`FROM index | COMPLETION keywordField WITH inferenceId`, []);
      });

      it('prompt is a parameter', () => {
        expectErrors(`FROM index | COMPLETION ?named_param WITH inferenceId`, []);
        expectErrors(`FROM index | COMPLETION ?123 WITH inferenceId`, []);
        expectErrors(`FROM index | COMPLETION ? WITH inferenceId`, []);
      });

      it('prompt is a text parenthesized expression', () => {
        expectErrors(
          `FROM index | COMPLETION ("Write an opinion about ES|QL") WITH inferenceId`,
          []
        );
        expectErrors(
          `FROM index | COMPLETION (CONCAT("Write an opinion about ", "ES|QL")) WITH inferenceId`,
          []
        );
      });
    });

    describe('incorrect uses with type errors', () => {
      it('prompt is a constant, but not text', async () => {
        await expectErrors(`FROM index | COMPLETION 47 WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [integer]',
        ]);

        await expectErrors(`FROM index | COMPLETION true WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [boolean]',
        ]);
      });

      it('prompt is a function, but does not return text', async () => {
        await expectErrors(`FROM index | COMPLETION PI() WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [double]',
        ]);

        await expectErrors(
          `FROM index
                    | EVAL day_of_week_i = 1
                    | COMPLETION CASE(
                      day_of_week_i == 0, 2,
                      day_of_week_i == 1, 1
                    ) WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [integer]']
        );

        await expectErrors(
          `FROM index | COMPLETION TO_DATETIME("2023-12-02T11:00:00.000Z") WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [date]']
        );

        await expectErrors(`FROM index | COMPLETION AVG(integerField) WITH inferenceId`, [
          'COMPLETION does not support function avg',
          '[COMPLETION] prompt must be of type [text] but is [double]',
        ]);
      });

      it('prompt is a column, but not a text one', () => {
        expectErrors(`FROM index | EVAL prompt = 47 | COMPLETION prompt WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [integer]',
        ]);
        expectErrors(
          `FROM index | EVAL prompt = to_ip("1.2.3.4") | COMPLETION prompt WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [ip]']
        );
        expectErrors(`FROM index | COMPLETION dateField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [date]',
        ]);
        expectErrors(`FROM index | COMPLETION longField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [long]',
        ]);
        expectErrors(`FROM index | COMPLETION versionField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [version]',
        ]);
        expectErrors(`FROM index | COMPLETION geoPointField WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [geo_point]',
        ]);
        expectErrors(
          `FROM index | RENAME counterIntegerField AS renamedField | COMPLETION renamedField WITH inferenceId`,
          ['[COMPLETION] prompt must be of type [text] but is [counter_integer]']
        );
      });

      it('prompt is an unknown field', () => {
        expectErrors(`FROM index | COMPLETION unknownField WITH inferenceId`, [
          'Unknown column [unknownField]',
        ]);
        expectErrors(`FROM index | COMPLETION \`unknownField\` WITH inferenceId`, [
          'Unknown column [unknownField]',
        ]);
      });

      it('prompt is a parenthesized expression, but not a text one', () => {
        expectErrors(`FROM index | COMPLETION (1 > 2) WITH inferenceId`, [
          '[COMPLETION] prompt must be of type [text] but is [boolean]',
        ]);
      });
    });

    describe('COMPLETION <targetField> = <prompt>...', () => {
      describe('if no targetField provided, the default targetField is `completion`', () => {
        it('completion field is not available before COMPLETION command', () => {
          expectErrors(`FROM index | KEEP completion | COMPLETION "prompt" WITH inferenceId`, [
            'Unknown column [completion]',
          ]);
        });

        it('completion field is available after completion command', () => {
          expectErrors(`FROM index | COMPLETION "prompt" WITH inferenceId | KEEP completion`, []);
        });
      });

      describe('a custom targetField is provided', () => {
        it('targetField is not available before COMPLETION', () => {
          expectErrors(
            `FROM index | KEEP customField | COMPLETION customField = "prompt" WITH inferenceId`,
            ['Unknown column [customField]']
          );
        });

        it('targetField is available after COMPLETION', () => {
          expectErrors(
            `FROM index | COMPLETION customField = "prompt" WITH inferenceId | KEEP customField`,
            []
          );
        });

        it('`completion` default field is not available after completion command', () => {
          expectErrors(
            `FROM index | COMPLETION customField = "prompt" WITH inferenceId | KEEP completion`,
            ['Unknown column [completion]']
          );
        });
      });
    });
  });
});
