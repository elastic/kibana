/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationCompletionCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('COMPLETION <prompt>...', () => {
      describe('valid uses with no errors', () => {
        test('prompt is a constant text', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION "Write an opinion about ES|QL" WITH inferenceId`,
            []
          );
        });

        test('prompt is a function that returns text', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION CONCAT("Write an opinion about ", "ES|QL") WITH inferenceId`,
            []
          );
          await expectErrors(
            `FROM index
                    | EVAL day_of_week_i = 1
                    | COMPLETION CASE(
                      day_of_week_i == 0, "Is today Monday?",
                      day_of_week_i == 1, "Is today Tuesday?"
                    ) WITH inferenceId`,
            []
          );
        });

        test('prompt is a text column', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | EVAL prompt = "Write an opinion about ES|QL" | COMPLETION prompt WITH inferenceId`,
            []
          );
          await expectErrors(
            `FROM index | EVAL prompt = CONCAT("Write an opinion about ", "ES|QL") | COMPLETION prompt WITH inferenceId`,
            []
          );
          await expectErrors(
            `FROM index
                    | EVAL day_of_week_i = 1
                    | EVAL prompt = CASE(
                      day_of_week_i == 0, "Is today Monday?",
                      day_of_week_i == 1, "Is today Tuesday?"
                    )
                    | COMPLETION prompt WITH inferenceId`,
            []
          );

          await expectErrors(
            `FROM index | RENAME textField AS renamedField | COMPLETION renamedField WITH inferenceId`,
            []
          );

          await expectErrors(`FROM index | COMPLETION textField WITH inferenceId`, []);
          await expectErrors(`FROM index | COMPLETION keywordField WITH inferenceId`, []);
        });

        test('prompt is a parameter', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index | COMPLETION ?named_param WITH inferenceId`, []);
          await expectErrors(`FROM index | COMPLETION ?123 WITH inferenceId`, []);
          await expectErrors(`FROM index | COMPLETION ? WITH inferenceId`, []);
        });

        test('prompt is a text parenthesized expression', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION ("Write an opinion about ES|QL") WITH inferenceId`,
            []
          );
          await expectErrors(
            `FROM index | COMPLETION (CONCAT("Write an opinion about ", "ES|QL")) WITH inferenceId`,
            []
          );
        });
      });

      describe('incorrect uses with type errors', () => {
        test('prompt is a constant, but not text', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index | COMPLETION 47 WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [integer]',
          ]);

          await expectErrors(`FROM index | COMPLETION true WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [boolean]',
          ]);
        });

        test('prompt is a function, but does not return text', async () => {
          const { expectErrors } = await setup();

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

        test('prompt is a column, but not a text one', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index | EVAL prompt = 47 | COMPLETION prompt WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [integer]',
          ]);
          await expectErrors(
            `FROM index | EVAL prompt = to_ip("1.2.3.4") | COMPLETION prompt WITH inferenceId`,
            ['[COMPLETION] prompt must be of type [text] but is [ip]']
          );
          await expectErrors(`FROM index | COMPLETION dateField WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [date]',
          ]);
          await expectErrors(`FROM index | COMPLETION longField WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [long]',
          ]);
          await expectErrors(`FROM index | COMPLETION versionField WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [version]',
          ]);
          await expectErrors(`FROM index | COMPLETION geoPointField WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [geo_point]',
          ]);
          await expectErrors(
            `FROM index | RENAME counterIntegerField AS renamedField | COMPLETION renamedField WITH inferenceId`,
            ['[COMPLETION] prompt must be of type [text] but is [counter_integer]']
          );
        });

        test('prompt is an unknown field', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index | COMPLETION unknownField WITH inferenceId`, [
            'Unknown column [unknownField]',
          ]);
          await expectErrors(`FROM index | COMPLETION \`unknownField\` WITH inferenceId`, [
            'Unknown column [unknownField]',
          ]);
        });

        test('prompt is a parenthesized expression, but not a text one', async () => {
          const { expectErrors } = await setup();

          await expectErrors(`FROM index | COMPLETION (1 > 2) WITH inferenceId`, [
            '[COMPLETION] prompt must be of type [text] but is [boolean]',
          ]);
        });
      });
    });

    describe('COMPLETION <targetField> = <prompt>...', () => {
      describe('if no targetField provided, the default targetField is `completion`', () => {
        test('completion field is not available before COMPLETION command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | KEEP completion | COMPLETION "prompt" WITH inferenceId`,
            ['Unknown column [completion]']
          );
        });

        test('completion field is available after completion command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION "prompt" WITH inferenceId | KEEP completion`,
            []
          );
        });
      });

      describe('a custom targetField is provided', () => {
        test('targetField is not available before COMPLETION', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | KEEP customField | COMPLETION customField = "prompt" WITH inferenceId`,
            ['Unknown column [customField]']
          );
        });

        test('targetField is available after COMPLETION', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION customField = "prompt" WITH inferenceId | KEEP customField`,
            []
          );
        });

        test('`completion` default field is not available after completion command', async () => {
          const { expectErrors } = await setup();

          await expectErrors(
            `FROM index | COMPLETION customField = "prompt" WITH inferenceId | KEEP completion`,
            ['Unknown column [completion]']
          );
        });
      });
    });
  });
};
