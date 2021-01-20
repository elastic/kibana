/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { internals } from '../internals';
import { Type } from './type';

export class NeverType extends Type<never> {
  constructor() {
    super(internals.any().forbidden());
  }

  protected handleError(type: string) {
    switch (type) {
      case 'any.unknown':
        return "a value wasn't expected to be present";
    }
  }
}
