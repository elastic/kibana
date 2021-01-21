/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionRenderDefinition } from './types';

export class ExpressionRenderer<Config = unknown> {
  public readonly name: string;
  public readonly displayName: string;
  public readonly help: string;
  public readonly validate: () => void | Error;
  public readonly reuseDomNode: boolean;
  public readonly render: ExpressionRenderDefinition<Config>['render'];

  constructor(config: ExpressionRenderDefinition<Config>) {
    const { name, displayName, help, validate, reuseDomNode, render } = config;

    this.name = name;
    this.displayName = displayName || name;
    this.help = help || '';
    this.validate = validate || (() => {});
    this.reuseDomNode = Boolean(reuseDomNode);
    this.render = render;
  }
}
