/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { validate } from './validate';
import { expectErrors } from '../../../__tests__/commands/validation';
import { mockContext } from '../../../__tests__/commands/context_fixtures';

const completionExpectErrors = (query: string, expectedErrors: string[], context = mockContext) => {
  return expectErrors(query, expectedErrors, context, 'completion', validate);
};

describe('COMPLETION Validation', () => {
  describe('COMPLETION <prompt>...', () => {
    describe('valid uses with no errors', () => {
      it('prompt is a constant text', () => {
        completionExpectErrors(
          'FROM index | COMPLETION "Write an opinion about ES|QL" WITH { "inference_id": "inferenceId"}',
          []
        );
      });

      it('prompt is a function that returns text', () => {
        completionExpectErrors(
          'FROM index | COMPLETION CONCAT("Write an opinion about ", "ES|QL") WITH { "inference_id": "inferenceId"}',
          []
        );

        completionExpectErrors(
          `FROM index
         | EVAL var0 = 1
         | COMPLETION CASE(
           var0 == 0, "Is today Monday?",
           var0 == 1, "Is today Tuesday?"
         ) WITH { "inference_id": "inferenceId"}`,
          []
        );
      });

      it('prompt is a text column', () => {
        completionExpectErrors(
          'FROM index | EVAL prompt = "Write an opinion about ES|QL" | COMPLETION prompt WITH { "inference_id": "inferenceId"}',
          []
        );

        completionExpectErrors(
          `FROM index | EVAL prompt = CONCAT("Write an opinion about ", "ES|QL") | COMPLETION prompt WITH { "inference_id": "inferenceId"}`,
          []
        );

        completionExpectErrors(
          `FROM index
         | EVAL var0 = 1
         | COMPLETION CASE(
           var0 == 0, "Is today Monday?",
           var0 == 1, "Is today Tuesday?"
         ) WITH { "inference_id": "inferenceId"}`,
          []
        );

        completionExpectErrors(
          'FROM index | RENAME keywordField AS renamedField | COMPLETION renamedField WITH { "inference_id": "inferenceId"}',
          []
        );

        completionExpectErrors(
          `FROM index | COMPLETION keywordField WITH { "inference_id": "inferenceId"}`,
          []
        );
      });

      it('prompt is a parameter', () => {
        completionExpectErrors(
          `FROM index | COMPLETION ?named_param WITH { "inference_id": "inferenceId"}`,
          []
        );
        completionExpectErrors(
          `FROM index | COMPLETION ?123 WITH { "inference_id": "inferenceId"}`,
          []
        );
        completionExpectErrors(
          `FROM index | COMPLETION ? WITH { "inference_id": "inferenceId"}`,
          []
        );
      });

      it('prompt is a text parenthesized expression', () => {
        completionExpectErrors(
          `FROM index | COMPLETION ("Write an opinion about ES|QL") WITH { "inference_id": "inferenceId"}`,
          []
        );
        completionExpectErrors(
          `FROM index | COMPLETION (CONCAT("Write an opinion about ", "ES|QL")) WITH { "inference_id": "inferenceId"}`,
          []
        );
      });
    });

    describe('incorrect uses with type errors', () => {
      it('prompt is a constant, but not text', async () => {
        await completionExpectErrors(
          `FROM index | COMPLETION 47 WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found integer']
        );

        await completionExpectErrors(
          `FROM index | COMPLETION true WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found boolean']
        );
      });

      it('prompt is a function, but does not return text', async () => {
        await completionExpectErrors(
          `FROM index | COMPLETION PI() WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found double']
        );

        await completionExpectErrors(
          `FROM index
                    | EVAL var0 = 1
                    | COMPLETION CASE(
                      var0 == 0, 2,
                      var0 == 1, 1
                    ) WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found integer']
        );

        await completionExpectErrors(
          `FROM index | COMPLETION TO_DATETIME("2023-12-02T11:00:00.000Z") WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found date']
        );

        await completionExpectErrors(
          `FROM index | COMPLETION AVG(integerField) WITH { "inference_id": "inferenceId"}`,
          [
            'COMPLETION query must be of type text. Found double',
            'Function AVG not allowed in COMPLETION',
          ]
        );
      });

      it('prompt is a column, but not a text one', () => {
        completionExpectErrors(
          `FROM index | EVAL integerPrompt = 47 | COMPLETION integerPrompt WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found integer']
        );
        completionExpectErrors(
          `FROM index | EVAL ipPrompt = to_ip("1.2.3.4") | COMPLETION ipPrompt WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found ip']
        );
        completionExpectErrors(
          `FROM index | COMPLETION dateField WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found date']
        );
        completionExpectErrors(
          `FROM index | COMPLETION counterIntegerField WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found counter_integer']
        );
      });

      it('prompt is an unknown field', () => {
        completionExpectErrors(
          `FROM index | COMPLETION unknownField WITH { "inference_id": "inferenceId"}`,
          ['Unknown column "unknownField"']
        );
        completionExpectErrors(
          `FROM index | COMPLETION \`unknownField\` WITH { "inference_id": "inferenceId"}`,
          ['Unknown column "unknownField"']
        );
      });

      it('prompt is a parenthesized expression, but not a text one', () => {
        completionExpectErrors(
          `FROM index | COMPLETION (1 > 2) WITH { "inference_id": "inferenceId"}`,
          ['COMPLETION query must be of type text. Found boolean']
        );
      });

      it('inference_id is not provided', () => {
        completionExpectErrors(`FROM index | COMPLETION "prompt"`, [
          '"inference_id" parameter is required for COMPLETION.',
        ]);
        completionExpectErrors(`FROM index | COMPLETION "prompt" WITH`, [
          '"inference_id" parameter is required for COMPLETION.',
        ]);
        completionExpectErrors(`FROM index | COMPLETION "prompt" WITH {}`, [
          '"inference_id" parameter is required for COMPLETION.',
        ]);
        completionExpectErrors(`FROM index | COMPLETION "prompt" WITH { "": ""}`, [
          '"inference_id" parameter is required for COMPLETION.',
        ]);
        completionExpectErrors(
          `FROM index | COMPLETION "prompt" WITH { "some_param": "some_value"}`,
          ['"inference_id" parameter is required for COMPLETION.']
        );
      });
    });

    describe('COMPLETION <targetField> = <prompt>...', () => {
      describe('if no targetField provided, the default targetField is `completion`', () => {
        it('completion field is available after completion command', () => {
          completionExpectErrors(
            `FROM index | COMPLETION "prompt" WITH { "inference_id": "inferenceId"} | KEEP completion`,
            []
          );
        });
      });

      describe('a custom targetField is provided', () => {
        it('targetField is available after COMPLETION', () => {
          completionExpectErrors(
            `FROM index | COMPLETION keywordField = "prompt" WITH { "inference_id": "inferenceId"} | KEEP keywordField`,
            []
          );
        });
      });
    });
  });
});
