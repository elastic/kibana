/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export class RenderCompleteListener {
  private readonly attributeName = 'data-render-complete';

  constructor(private readonly element: HTMLElement) {
    this.setup();
  }

  public destroy = () => {
    this.element.removeEventListener('renderStart', this.start);
    this.element.removeEventListener('renderComplete', this.complete);
  };

  public setup = () => {
    this.element.setAttribute(this.attributeName, 'false');
    this.element.addEventListener('renderStart', this.start);
    this.element.addEventListener('renderComplete', this.complete);
  };

  public disable = () => {
    this.element.setAttribute(this.attributeName, 'disabled');
    this.destroy();
  };

  private start = () => {
    this.element.setAttribute(this.attributeName, 'false');
    return true;
  };

  private complete = () => {
    this.element.setAttribute(this.attributeName, 'true');
    return true;
  };
}
