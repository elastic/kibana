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

import { PainlessCompletionResult, PainlessContext, Field } from '../types';

import { PainlessCompletionService } from './services';

import {
  isDeclaringField,
  isConstructorInstance,
  isAccessingProperty,
  showStaticSuggestions,
} from './utils';

export class PainlessWorker {
  async provideAutocompleteSuggestions(
    currentLineChars: string,
    context: PainlessContext,
    fields?: Field[]
  ): Promise<PainlessCompletionResult> {
    const completionService = new PainlessCompletionService(context);
    // Array of the active line words, e.g., [boolean, isTrue, =, true]
    const words = currentLineChars.replace('\t', '').split(' ');
    // What the user is currently typing
    const activeTyping = words[words.length - 1];

    const primitives = completionService.getPrimitives();

    let autocompleteSuggestions: PainlessCompletionResult = {
      isIncomplete: false,
      suggestions: [],
    };

    if (isConstructorInstance(words)) {
      autocompleteSuggestions = completionService.getConstructorSuggestions();
    } else if (fields && isDeclaringField(activeTyping)) {
      autocompleteSuggestions = completionService.getFieldSuggestions(fields);
    } else if (isAccessingProperty(activeTyping)) {
      const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];
      autocompleteSuggestions = completionService.getClassMemberSuggestions(className);
    } else if (showStaticSuggestions(activeTyping, words, primitives)) {
      autocompleteSuggestions = completionService.getStaticSuggestions(Boolean(fields?.length));
    }

    return Promise.resolve(autocompleteSuggestions);
  }
}
