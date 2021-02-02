/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import { ConstantComponent } from './constant_component';

export class FullRequestComponent extends ConstantComponent {
  private readonly name: string;
  constructor(name: string, parent: any, private readonly template: string) {
    super(name, parent);
    this.name = name;
  }

  getTerms() {
    return [{ name: this.name, snippet: this.template }];
  }
}
