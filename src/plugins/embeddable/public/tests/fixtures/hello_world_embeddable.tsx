/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Embeddable, EmbeddableInput, IContainer } from '../..';

export const HELLO_WORLD_EMBEDDABLE = 'HELLO_WORLD_EMBEDDABLE';

export class HelloWorldEmbeddable extends Embeddable {
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = HELLO_WORLD_EMBEDDABLE;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    node.innerHTML = '<div data-test-subj="helloWorldEmbeddable">HELLO WORLD!</div>';
  }

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
   */
  public reload() {}
}
