/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export abstract class BaseTemplate<T> {
  protected templates: string[] = [];

  public abstract loadTemplates(templates: T): void;

  public getTemplates = (): string[] => {
    return [...this.templates];
  };

  public clearTemplates = () => {
    this.templates = [];
  };
}
