/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import * as path from 'path';
import { makeAbsolutePath } from '../utils';
import { extractI18nMessageDescriptors, verifyMessageDescriptor } from './formatjs';

const formatJsFixtureRunner = async (filePath: string) => {
  const absolutePath = makeAbsolutePath(
    path.join(__dirname, '..', '__fixtures__', 'extraction_signatures', filePath)
  );
  const source = await readFile(absolutePath, 'utf8');
  const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

  extractedMessages.forEach((messageDescriptor) => {
    try {
      verifyMessageDescriptor(messageDescriptor.defaultMessage, messageDescriptor);
    } catch (err) {
      // @ts-expect-error
      messageDescriptor.VerifyError = err.message;
    }
  });

  return { extractedMessages };
};

describe('formatJS Runner', () => {
  describe('extraction of `i18n.translate`', () => {
    it('parses all expected cases for i18n translated as expected', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('i18n_translate.ts');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "with_ICU_value" => Object {
            "defaultMessage": "I have a basic ICU {VALUE_HERE} message",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "with_ICU_value",
            "start": -1,
            "valuesKeys": Array [
              "VALUE_HERE",
            ],
          },
          "value_defined_as_variable" => Object {
            "defaultMessage": "Interval must be at least {minimum}.",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "value_defined_as_variable",
            "start": -1,
            "valuesKeys": Array [
              "minimum",
            ],
          },
          "with_nested_i18n" => Object {
            "defaultMessage": "The {formatLink} for pretty formatted dates.",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "with_nested_i18n",
            "start": -1,
            "valuesKeys": Array [
              "formatLink",
            ],
          },
          "with_html_tags_nested_variables_inside" => Object {
            "defaultMessage": "Allows you to set which shards handle your search requests. <ul> <li><strong>{sessionId}:</strong> restricts operations to execute all search requests on the same shards. This has the benefit of reusing shard caches across requests.</li> <li><strong>{custom}:</strong> allows you to define a your own preference. Use <strong>courier:customRequestPreference</strong> to customize your preference value.</li> <li><strong>{none}:</strong> means do not set a preference. This might provide better performance because requests can be spread across all shard copies. However, results might be inconsistent because different shards might be in different refresh states.</li> </ul>",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "with_html_tags_nested_variables_inside",
            "start": -1,
            "valuesKeys": Array [
              "sessionId",
              "custom",
              "none",
              "ul",
              "li",
              "strong",
            ],
          },
          "with_ignored_tags" => Object {
            "defaultMessage": "Update {numberOfIndexPatternsWithScriptedFields} data views that have scripted fields to use runtime fields instead. In most cases, to migrate existing scripts, you will need to change \\"return <value>;\\" to \\"emit(<value>);\\". Data views with at least one scripted field: {allTitles}",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "with_ignored_tags",
            "ignoreTag": true,
            "start": -1,
            "valuesKeys": Array [
              "allTitles",
              "numberOfIndexPatternsWithScriptedFields",
            ],
          },
          "complext_nesting" => Object {
            "defaultMessage": "{aggName} (interval: {interval}, {delay} {time_zone})",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "complext_nesting",
            "start": -1,
            "valuesKeys": Array [
              "aggName",
              "interval",
              "delay",
              "time_zone",
            ],
          },
          "i_am_optional_nested_inside" => Object {
            "defaultMessage": "delay: {delay},",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "i_am_optional_nested_inside",
            "start": -1,
            "valuesKeys": Array [
              "delay",
            ],
          },
          "double_tagged" => Object {
            "defaultMessage": "Returns the maximum value from multiple columns. This is similar to <<esql-mv_max>> except it is intended to run on multiple columns at once.",
            "end": -1,
            "file": "i18n_translate.ts",
            "id": "double_tagged",
            "ignoreTag": true,
            "start": -1,
          },
          "select_syntax" => Object {
            "defaultMessage": "{rangeType, select, between {Must be between {min} and {max}} gt {Must be greater than {min}} lt {Must be less than {max}} other {Must be an integer} }",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "select_syntax",
            "start": -1,
            "valuesKeys": Array [
              "min",
              "max",
              "rangeType",
            ],
          },
          "plural_syntax_with_nested_variable" => Object {
            "defaultMessage": "{totalCases, plural, =1 {Case \\"{caseTitle}\\" was} other {{totalCases} cases were}} set to {severity}",
            "end": -1,
            "file": "i18n_translate.ts",
            "hasValuesObject": true,
            "id": "plural_syntax_with_nested_variable",
            "start": -1,
            "valuesKeys": Array [
              "totalCases",
              "severity",
              "caseTitle",
            ],
          },
          "basic" => Object {
            "defaultMessage": "i18n.translate default message",
            "end": -1,
            "file": "i18n_translate.ts",
            "id": "basic",
            "start": -1,
          },
          "i_am_nested_inside" => Object {
            "defaultMessage": "format",
            "end": -1,
            "file": "i18n_translate.ts",
            "id": "i_am_nested_inside",
            "start": -1,
          },
        }
      `);
    });

    it('parses complex cases for i18n translated as expected', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('complex_i18n_cases.ts');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "Multiple_Binary_strings_with_No_Substitution_Template_Literal" => Object {
            "defaultMessage": "{objectCount, plural, one {# object} other {# objects}} with unknown types {objectCount, plural, one {was} other {were}} found in Kibana system indices. Upgrading with unknown savedObject types is no longer supported. To ensure that upgrades will succeed in the future, either re-enable plugins or delete these documents from the Kibana indices",
            "end": -1,
            "file": "complex_i18n_cases.ts",
            "hasValuesObject": true,
            "id": "Multiple_Binary_strings_with_No_Substitution_Template_Literal",
            "start": -1,
            "valuesKeys": Array [
              "objectCount",
            ],
          },
          "more_than_3_No_Substitution_Template_Literals" => Object {
            "defaultMessage": "The UI theme that the Kibana UI should use. Set to 'enabled' or 'disabled' to enable or disable the dark theme. Set to 'system' to have the Kibana UI theme follow the system theme. A page refresh is required for the setting to be applied.",
            "end": -1,
            "file": "complex_i18n_cases.ts",
            "id": "more_than_3_No_Substitution_Template_Literals",
            "start": -1,
          },
        }
      `);
    });

    it('parses renamed i18n imports as expected', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('renamed_i18n.ts');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "renamed_i18n" => Object {
            "defaultMessage": "renamed I18n.translate is parsed!",
            "end": -1,
            "file": "renamed_i18n.ts",
            "id": "renamed_i18n",
            "start": -1,
          },
        }
      `);
    });

    it('throws when ICU message with values does not have defined { values }', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('not_defined_value.ts');

      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "extra_value_test_ts_call" => Object {
            "VerifyError": "Messsage with ID extra_value_test_ts_call in not_defined_value.ts requires the following values [MISSING_VALUE] to be defined.",
            "defaultMessage": "hey! this value is missing {MISSING_VALUE} value here",
            "end": -1,
            "file": "not_defined_value.ts",
            "id": "extra_value_test_ts_call",
            "start": -1,
          },
        }
      `);
    });
    it('throws when message has extra unused defined { values }', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('unused_value.ts');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "extra_value_test_ts_call" => Object {
            "VerifyError": "Messsage with ID extra_value_test_ts_call in unused_value.ts has defined values while the defaultMessage does not require any.",
            "defaultMessage": "hey! there is an unused value here",
            "end": -1,
            "file": "unused_value.ts",
            "hasValuesObject": true,
            "id": "extra_value_test_ts_call",
            "start": -1,
            "valuesKeys": Array [
              "UNUSED_VALUE",
            ],
          },
        }
      `);
    });

    it('throws when message has malformed ICU syntx', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('malformed_icu.ts');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "wrong_select_icu_syntax" => Object {
            "VerifyError": "MISSING_OTHER_CLAUSE",
            "defaultMessage": "This is a malformed select ICU {MISSING_VALUE, select, one {one} two {two}} no other",
            "end": -1,
            "file": "malformed_icu.ts",
            "id": "wrong_select_icu_syntax",
            "start": -1,
          },
        }
      `);
    });

    it('throws when template literal has a variable', async () => {
      await expect(async () =>
        formatJsFixtureRunner('template_literal_var.ts')
      ).rejects.toMatchInlineSnapshot(
        `[Error: Error parsing file template_literal_var.ts: Error: Template literals with variable substitution is not supported. please pass variables via the 'values' object instead. Message  \`value passed into literal directly (e: \${e.message})\`]`
      );
    });
  });

  describe('extraction inside react components', () => {
    it('parses intl prop correctly', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('intl_prop.tsx');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "home.tutorial.unexpectedStatusCheckStateErrorDescription" => Object {
            "defaultMessage": "Unexpected status check state {statusCheckState}",
            "end": 777,
            "file": "intl_prop.tsx",
            "hasValuesObject": true,
            "id": "home.tutorial.unexpectedStatusCheckStateErrorDescription",
            "start": 613,
            "valuesKeys": Array [
              "statusCheckState",
            ],
          },
          "message_with_no_values" => Object {
            "defaultMessage": "Pipeline batch delay",
            "end": 1018,
            "file": "intl_prop.tsx",
            "id": "message_with_no_values",
            "start": 929,
          },
          "messsage_inside_component" => Object {
            "defaultMessage": "Pipeline batch delay",
            "end": 1239,
            "file": "intl_prop.tsx",
            "id": "messsage_inside_component",
            "start": 1135,
          },
        }
      `);
    });

    it('parses FormattedMessage and i18n.translate inside react components correctly', async () => {
      const { extractedMessages } = await formatJsFixtureRunner('intl_prop.tsx');
      expect(extractedMessages).toMatchInlineSnapshot(`
        Map {
          "home.tutorial.unexpectedStatusCheckStateErrorDescription" => Object {
            "defaultMessage": "Unexpected status check state {statusCheckState}",
            "end": 777,
            "file": "intl_prop.tsx",
            "hasValuesObject": true,
            "id": "home.tutorial.unexpectedStatusCheckStateErrorDescription",
            "start": 613,
            "valuesKeys": Array [
              "statusCheckState",
            ],
          },
          "message_with_no_values" => Object {
            "defaultMessage": "Pipeline batch delay",
            "end": 1018,
            "file": "intl_prop.tsx",
            "id": "message_with_no_values",
            "start": 929,
          },
          "messsage_inside_component" => Object {
            "defaultMessage": "Pipeline batch delay",
            "end": 1239,
            "file": "intl_prop.tsx",
            "id": "messsage_inside_component",
            "start": 1135,
          },
        }
      `);
    });
  });
});
