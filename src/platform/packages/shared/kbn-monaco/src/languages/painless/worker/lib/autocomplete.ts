/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import {
  PainlessCompletionResult,
  PainlessCompletionItem,
  PainlessContext,
  PainlessAutocompleteField,
} from '../../types';

import {
  commonContext,
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

export const getKeywords = (): PainlessCompletionItem[] => {
  const lexerKeywords: PainlessCompletionItem[] = lexerRules.keywords.map((keyword) => {
    return {
      label: keyword,
      kind: 'keyword',
      documentation: `Keyword: ${keyword}`,
      insertText: keyword,
    };
  });

  const allKeywords: PainlessCompletionItem[] = [
    ...lexerKeywords,
    {
      label: 'params',
      kind: 'keyword',
      documentation: i18n.translate(
        'monaco.painlessLanguage.autocomplete.paramsKeywordDescription',
        {
          defaultMessage: 'Access variables passed into the script.',
        }
      ),
      insertText: 'params',
    },
  ];

  return allKeywords;
};

export const getTypeSuggestions = (): PainlessCompletionItem[] => {
  return lexerRules.primitives.map((primitive) => {
    return {
      label: primitive,
      kind: 'type',
      documentation: `Type: ${primitive}`,
      insertText: primitive,
    };
  });
};

const runtimeContexts: PainlessContext[] = [
  'boolean_script_field_script_field',
  'date_script_field',
  'double_script_field_script_field',
  'ip_script_field_script_field',
  'long_script_field_script_field',
  'string_script_field_script_field',
];

const mapContextToData: { [key: string]: { suggestions: any[] } } = {
  painless_test: commonContext,
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

export const getStaticSuggestions = ({
  suggestions,
  hasFields,
  isRuntimeContext,
}: {
  suggestions: Suggestion[];
  hasFields?: boolean;
  isRuntimeContext?: boolean;
}): PainlessCompletionResult => {
  const classSuggestions: PainlessCompletionItem[] = suggestions.map((suggestion) => {
    const { properties, constructorDefinition, ...rootSuggestion } = suggestion;
    return rootSuggestion;
  });

  const keywords = getKeywords();
  const typeSuggestions = getTypeSuggestions();

  let keywordSuggestions: PainlessCompletionItem[] = hasFields
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

  keywordSuggestions = isRuntimeContext
    ? [
        ...keywordSuggestions,
        {
          label: 'emit',
          kind: 'keyword',
          documentation: i18n.translate(
            'monaco.painlessLanguage.autocomplete.emitKeywordDescription',
            {
              defaultMessage: 'Emit value without returning.',
            }
          ),
          insertText: 'emit',
        },
      ]
    : keywordSuggestions;

  return {
    isIncomplete: false,
    suggestions: [...classSuggestions, ...keywordSuggestions, ...typeSuggestions],
  };
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

export const getFieldSuggestions = (
  fields: PainlessAutocompleteField[]
): PainlessCompletionResult => {
  const suggestions: PainlessCompletionItem[] = fields.map(({ name }) => {
    return {
      label: name,
      kind: 'field',
      documentation: i18n.translate('monaco.painlessLanguage.autocomplete.fieldValueDescription', {
        defaultMessage: `Retrieve the value for field ''{fieldName}''`,
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
  fields?: PainlessAutocompleteField[]
): PainlessCompletionResult => {
  // Unique suggestions based on context
  const contextSuggestions = mapContextToData[painlessContext].suggestions;
  // Enhance suggestions with common classes that exist in all contexts
  // "painless_test" is the exception since it equals the common suggestions
  const suggestions =
    painlessContext === 'painless_test'
      ? contextSuggestions
      : contextSuggestions.concat(commonContext.suggestions);
  // What the user is currently typing
  const activeTyping = words[words.length - 1];
  // This logic may end up needing to be more robust as we integrate autocomplete into more editors
  // For now, we're assuming there is a list of painless contexts that are only applicable in runtime fields
  const isRuntimeContext = runtimeContexts.includes(painlessContext);
  // "text" field types are not available in doc values and should be removed for autocompletion
  const filteredFields = fields?.filter((field) => field.type !== 'text');
  const hasFields = Boolean(filteredFields?.length);

  let autocompleteSuggestions: PainlessCompletionResult = {
    isIncomplete: false,
    suggestions: [],
  };

  if (isConstructorInstance(words)) {
    autocompleteSuggestions = getConstructorSuggestions(suggestions);
  } else if (filteredFields && isDeclaringField(activeTyping)) {
    autocompleteSuggestions = getFieldSuggestions(filteredFields);
  } else if (isAccessingProperty(activeTyping)) {
    const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];
    autocompleteSuggestions = getClassMemberSuggestions(suggestions, className);
  } else if (showStaticSuggestions(activeTyping, words, lexerRules.primitives)) {
    autocompleteSuggestions = getStaticSuggestions({ suggestions, hasFields, isRuntimeContext });
  }
  return autocompleteSuggestions;
};
