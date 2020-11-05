/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';

import {
  PainlessCompletionResult,
  PainlessCompletionItem,
  PainlessContext,
  Field,
} from '../../types';

import {
  painlessTestContext,
  scoreContext,
  filterContext,
  booleanScriptFieldScriptFieldContext,
  dateScriptFieldContext,
  doubleScriptFieldScriptFieldContext,
  ipScriptFieldScriptFieldContext,
  longScriptFieldScriptFieldContext,
  processorConditionalContext,
  stringScriptFieldScriptFieldContext,
} from '../../autocomplete_definitions';

import { lexerRules } from '../../lexer_rules';

export interface Suggestion extends PainlessCompletionItem {
  properties?: PainlessCompletionItem[];
  constructorDefinition?: PainlessCompletionItem;
}

const keywords: PainlessCompletionItem[] = lexerRules.keywords.map((keyword) => {
  return {
    label: keyword,
    kind: 'keyword',
    documentation: 'Keyword: char',
    insertText: keyword,
  };
});

const mapContextToData: { [key: string]: { suggestions: any[] } } = {
  painless_test: painlessTestContext,
  score: scoreContext,
  filter: filterContext,
  boolean_script_field_script_field: booleanScriptFieldScriptFieldContext,
  date_script_field: dateScriptFieldContext,
  double_script_field_script_field: doubleScriptFieldScriptFieldContext,
  ip_script_field_script_field: ipScriptFieldScriptFieldContext,
  long_script_field_script_field: longScriptFieldScriptFieldContext,
  processor_conditional: processorConditionalContext,
  string_script_field_script_field: stringScriptFieldScriptFieldContext,
};

export class PainlessCompletionService {
  suggestions: Suggestion[];
  constructor(private _painlessContext: PainlessContext) {
    this.suggestions = mapContextToData[this._painlessContext].suggestions;
  }

  getStaticSuggestions(hasFields: boolean): PainlessCompletionResult {
    const classSuggestions: PainlessCompletionItem[] = this.suggestions.map((suggestion) => {
      const { properties, constructorDefinition, ...rootSuggestion } = suggestion;
      return rootSuggestion;
    });

    const keywordSuggestions: PainlessCompletionItem[] = hasFields
      ? [
          ...keywords,
          {
            label: 'doc',
            kind: 'keyword',
            documentation: i18n.translate(
              'monaco.painlessLanguage.autocomplete.docKeywordDescription',
              {
                defaultMessage: `Access a field value from a script using the doc['field_name'] syntax`,
              }
            ),
            insertText: "doc[${1:'my_field'}]",
            insertTextAsSnippet: true,
          },
        ]
      : keywords;

    return {
      isIncomplete: false,
      suggestions: [...classSuggestions, ...keywordSuggestions],
    };
  }

  getPrimitives(): string[] {
    return this.suggestions
      .filter((suggestion) => suggestion.kind === 'type')
      .map((type) => type.label);
  }

  getClassMemberSuggestions(className: string): PainlessCompletionResult {
    const painlessClass = this.suggestions.find((suggestion) => suggestion.label === className);

    return {
      isIncomplete: false,
      suggestions: painlessClass?.properties || [],
    };
  }

  getFieldSuggestions(fields: Field[]): PainlessCompletionResult {
    const suggestions: PainlessCompletionItem[] = fields.map(({ name }) => {
      return {
        label: name,
        kind: 'field',
        documentation: i18n.translate(
          'monaco.painlessLanguage.autocomplete.fieldValueDescription',
          {
            defaultMessage: `Retrieve the value for field '{fieldName}'`,
            values: {
              fieldName: name,
            },
          }
        ),
        insertText: `${name}'`,
      };
    });

    return {
      isIncomplete: false,
      suggestions,
    };
  }

  getConstructorSuggestions(): PainlessCompletionResult {
    let constructorSuggestions: PainlessCompletionItem[] = [];

    const suggestionsWithConstructors = this.suggestions.filter(
      (suggestion) => suggestion.constructorDefinition
    );

    if (suggestionsWithConstructors) {
      constructorSuggestions = suggestionsWithConstructors.map(
        (filteredSuggestion) => filteredSuggestion.constructorDefinition!
      );
    }

    return {
      isIncomplete: false,
      suggestions: constructorSuggestions,
    };
  }
}
