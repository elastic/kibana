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

import { PainlessCompletionResult, PainlessCompletionItem, PainlessContext } from '../../types';
import {
  painless_test,
  score,
  filter,
  boolean_script_field_script_field,
  date_script_field,
  double_script_field_script_field,
  ip_script_field_script_field,
  long_script_field_script_field,
  processor_conditional,
  string_script_field_script_field,
} from '../../autocomplete_definitions';

interface Suggestion extends PainlessCompletionItem {
  children: PainlessCompletionItem[];
}

const mapContextToData: { [key: string]: object } = {
  painless_test,
  score,
  filter,
  boolean_script_field_script_field,
  date_script_field,
  double_script_field_script_field,
  ip_script_field_script_field,
  long_script_field_script_field,
  processor_conditional,
  string_script_field_script_field,
};

export class PainlessCompletionService {
  suggestions: Suggestion[];
  constructor(private _painlessContext: PainlessContext) {
    this.suggestions = mapContextToData[this._painlessContext] as Suggestion[];
  }

  getStaticSuggestions(): PainlessCompletionResult {
    const suggestions: PainlessCompletionItem[] = this.suggestions.map((suggestion) => {
      const { children, ...rootSuggestion } = suggestion;
      return rootSuggestion;
    });
    return {
      isIncomplete: false,
      suggestions,
    };
  }

  getPrimitives(): string[] {
    return this.suggestions
      .filter((suggestion) => suggestion.kind === 'type')
      .map((type) => type.label);
  }

  getPainlessClassSuggestions(className: string): PainlessCompletionResult {
    const painlessClass = this.suggestions.find((suggestion) => suggestion.label === className);

    return {
      isIncomplete: false,
      suggestions: painlessClass?.children || [],
    };
  }
}
