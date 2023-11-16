/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { distinctUntilKeyChanged } from 'rxjs';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../lib';

export const useSelectFromEmbeddableInput = <
  InputType extends EmbeddableInput,
  KeyType extends keyof InputType
>(
  key: KeyType,
  embeddable?: IEmbeddable<InputType>
): InputType[KeyType] | undefined => {
  const [value, setValue] = useState<InputType[KeyType] | undefined>(embeddable?.getInput()[key]);
  useEffect(() => {
    const subscription = embeddable
      ?.getInput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => setValue(embeddable.getInput()[key]));
    return () => subscription?.unsubscribe();
  }, [embeddable, key]);

  return value;
};

export const useSelectFromEmbeddableOutput = <
  OutputType extends EmbeddableOutput,
  KeyType extends keyof OutputType
>(
  key: KeyType,
  embeddable: IEmbeddable<EmbeddableInput, OutputType>
): OutputType[KeyType] => {
  const [value, setValue] = useState<OutputType[KeyType]>(embeddable.getOutput()[key]);
  useEffect(() => {
    const subscription = embeddable
      .getOutput$()
      .pipe(distinctUntilKeyChanged(key))
      .subscribe(() => setValue(embeddable.getOutput()[key]));
    return () => subscription.unsubscribe();
  }, [embeddable, key]);

  return value;
};
