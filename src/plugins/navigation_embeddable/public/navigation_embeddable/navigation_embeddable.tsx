/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { Embeddable } from '@kbn/embeddable-plugin/public';
import type { EmbeddableInput, IContainer } from '@kbn/embeddable-plugin/public';

export const NAVIGATION_EMBEDDABLE_TYPE = 'navigation';

export class NavigationEmbeddable extends Embeddable {
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  constructor(initialInput: EmbeddableInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  public render(el: HTMLElement) {
    return (
      <EuiTitle>
        <h3>Call me Magellan, cuz I&apos;m a navigator!</h3>
      </EuiTitle>
    );
  }

  public reload() {}
}
