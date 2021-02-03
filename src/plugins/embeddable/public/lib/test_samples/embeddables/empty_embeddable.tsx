/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Embeddable, EmbeddableInput, EmbeddableOutput } from '../..';

export const EMPTY_EMBEDDABLE = 'EMPTY_EMBEDDABLE';

export class EmptyEmbeddable extends Embeddable<EmbeddableInput, EmbeddableOutput> {
  public readonly type = EMPTY_EMBEDDABLE;
  constructor(initialInput: EmbeddableInput) {
    super(initialInput, {});
  }
  public render() {}
  public reload() {}
}
