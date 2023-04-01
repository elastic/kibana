/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PainlessContext } from '@kbn/monaco';
import { BehaviorSubject } from 'rxjs';
import { PainlessLang } from '@kbn/monaco';
import { BehaviorObservable } from '../../../state_utils';

interface ScriptFieldControllerArgs {
  painlessContext: PainlessContext;
  existingConcreteFields:
    | Array<{
        name: string;
        type: string;
      }>
    | undefined;
}

interface ScriptFieldState {
  // not used externally
  painlessContext: PainlessContext;
  suggestionProvider: any; // poor typying in @kbn/monaco
}

export class ScriptFieldController {
  constructor({ painlessContext, existingConcreteFields }: ScriptFieldControllerArgs) {
    this.internalState$ = new BehaviorSubject<ScriptFieldState>({
      painlessContext,
      suggestionProvider: PainlessLang.getSuggestionProvider(
        painlessContext,
        existingConcreteFields
      ),
    });

    this.state$ = this.internalState$ as BehaviorObservable<ScriptFieldState>;

    this.existingConcreteFields = existingConcreteFields;
  }

  private internalState$: BehaviorSubject<ScriptFieldState>;
  state$: BehaviorObservable<ScriptFieldState>;

  existingConcreteFields: ScriptFieldControllerArgs['existingConcreteFields'];

  setPainlessContext = (painlessContext: PainlessContext) => {
    this.internalState$.next({
      painlessContext,
      suggestionProvider: PainlessLang.getSuggestionProvider(
        painlessContext,
        this.existingConcreteFields
      ),
    });
  };
}
