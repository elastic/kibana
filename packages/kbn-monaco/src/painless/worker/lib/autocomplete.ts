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

import {
  isDeclaringField,
  isConstructorInstance,
  isAccessingProperty,
  showStaticSuggestions,
} from './autocomplete_utils';

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

export const getStaticSuggestions = (
  suggestions: Suggestion[],
  hasFields: boolean
): PainlessCompletionResult => {
  const classSuggestions: PainlessCompletionItem[] = suggestions.map((suggestion) => {
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
};

export const getPrimitives = (suggestions: Suggestion[]): string[] => {
  return suggestions.filter((suggestion) => suggestion.kind === 'type').map((type) => type.label);
};

export const getClassMemberSuggestions = (
  suggestions: Suggestion[],
  className: string
): PainlessCompletionResult => {
  const painlessClass = suggestions.find((suggestion) => suggestion.label === className);

  return {
    isIncomplete: false,
    suggestions: painlessClass?.properties || [],
  };
};

export const getFieldSuggestions = (fields: Field[]): PainlessCompletionResult => {
  const suggestions: PainlessCompletionItem[] = fields.map(({ name }) => {
    return {
      label: name,
      kind: 'field',
      documentation: i18n.translate('monaco.painlessLanguage.autocomplete.fieldValueDescription', {
        defaultMessage: `Retrieve the value for field '{fieldName}'`,
        values: {
          fieldName: name,
        },
      }),
      // A trailing quotation mark is added to format the field for the user
      insertText: `${name}'`,
    };
  });

  return {
    isIncomplete: false,
    suggestions,
  };
};

export const getConstructorSuggestions = (suggestions: Suggestion[]): PainlessCompletionResult => {
  let constructorSuggestions: PainlessCompletionItem[] = [];

  const suggestionsWithConstructors = suggestions.filter(
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
};

export const getAutocompleteSuggestions = (
  painlessContext: PainlessContext,
  words: string[],
  fields?: Field[]
): PainlessCompletionResult => {
  const suggestions = mapContextToData[painlessContext].suggestions;
  // What the user is currently typing
  const activeTyping = words[words.length - 1];
  const primitives = getPrimitives(suggestions);

  let autocompleteSuggestions: PainlessCompletionResult = {
    isIncomplete: false,
    suggestions: [],
  };

  if (isConstructorInstance(words)) {
    autocompleteSuggestions = getConstructorSuggestions(suggestions);
  } else if (fields && isDeclaringField(activeTyping)) {
    autocompleteSuggestions = getFieldSuggestions(fields);
  } else if (isAccessingProperty(activeTyping)) {
    const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];
    autocompleteSuggestions = getClassMemberSuggestions(suggestions, className);
  } else if (showStaticSuggestions(activeTyping, words, primitives)) {
    autocompleteSuggestions = getStaticSuggestions(suggestions, Boolean(fields?.length));
  }
  return autocompleteSuggestions;
};
