/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PainlessContext } from '@kbn/monaco';
import { BehaviorSubject } from 'rxjs';
import { BehaviorObservable } from '../../../state_utils';

type ScriptedFieldState = PainlessContext;

export class ScriptFieldController {
  constructor({ defaultValue }: { defaultValue: ScriptedFieldState }) {
    this.internalState$ = new BehaviorSubject<ScriptedFieldState>(defaultValue);

    this.state$ = this.internalState$ as BehaviorObservable<ScriptedFieldState>;
    console.log('CONTSRUCTOR');
  }
  private internalState$: BehaviorSubject<ScriptedFieldState>;
  state$: BehaviorObservable<ScriptedFieldState>;

  setPainlessContext = (painlessContext: ScriptedFieldState) => {
    this.internalState$.next(painlessContext);
  };
}
