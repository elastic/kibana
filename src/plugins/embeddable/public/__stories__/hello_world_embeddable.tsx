/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { connect, Provider } from 'react-redux';
import { EuiEmptyPrompt } from '@elastic/eui';
import { Embeddable } from '..';
import { createStore, State } from '../store';

export class HelloWorldEmbeddable extends Embeddable {
  // eslint-disable-next-line @kbn/eslint/no_this_in_property_initializers
  readonly store = createStore(this);

  readonly type = 'hello-world';

  reload() {}

  render() {
    const HelloWorld = connect((state: State) => ({ body: state.input.title }))(EuiEmptyPrompt);

    return (
      <Provider store={this.store}>
        <HelloWorld />
      </Provider>
    );
  }
}
