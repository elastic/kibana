/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import uuid from 'uuid';
import type { Storage } from '.';

export const generateDefaultVariable = () => ({
  name: '',
  active: true,
  value: '',
  id: uuid.v4(),
});

export interface DevToolsVariable {
  name: string;
  active: boolean;
  value: string;
  id: string;
}

enum Keys {
  VARIABLES = 'console_variables',
}

export class Variables {
  constructor(private readonly storage: Storage) {}

  get(): DevToolsVariable[] {
    return this.storage.get(Keys.VARIABLES, []);
  }

  set(v: DevToolsVariable[]) {
    this.storage.set(Keys.VARIABLES, v);
  }

  toJSON(): DevToolsVariable[] {
    return this.get();
  }

  update(variables: DevToolsVariable[]) {
    this.set(variables);
  }

  extractValue(key: string) {
    return this.get().find((v) => v.name === key)?.value ?? '';
  }
}

interface Dep {
  storage: Storage;
}

export function createVariables({ storage }: Dep) {
  return new Variables(storage);
}

export const [getVariables, setVariables] = createGetterSetter<Variables>('Console variables');
