/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container, type ContainerOptions } from 'inversify';

interface InternalContainerOptions extends ContainerOptions {
  parent?: InternalContainer;
}

export class InternalContainer extends Container {
  constructor(private readonly options?: InternalContainerOptions) {
    super(options);
    this.bind(InternalContainer).toConstantValue(this);
    this.bind(Container).toService(InternalContainer);
  }

  public createChild(): InternalContainer {
    return new InternalContainer({ ...this.options, parent: this });
  }

  public get parent(): InternalContainer | undefined {
    return this.options?.parent;
  }
}
