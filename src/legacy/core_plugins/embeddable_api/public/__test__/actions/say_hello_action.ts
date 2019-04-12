/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Action, ActionContext, ExecuteActionContext } from '../../actions';
import { EmbeddableInput, Embeddable, EmbeddableOutput } from '../../embeddables';

export const SAY_HELLO_ACTION = 'SAY_HELLO_ACTION';

interface SayHelloEmbeddableOutput extends EmbeddableOutput {
  name: string;
}

type SayHelloEmbeddable = Embeddable<EmbeddableInput, SayHelloEmbeddableOutput>;

export class SayHelloAction extends Action {
  private sayHello: (name: string) => void;
  constructor(sayHello: (name: string) => void) {
    super(SAY_HELLO_ACTION);
    this.sayHello = sayHello;
  }

  getTitle() {
    return 'Say hello';
  }

  isCompatible(context: ActionContext<SayHelloEmbeddable>) {
    return Promise.resolve(context.embeddable.getOutput().name !== undefined);
  }

  execute(context: ExecuteActionContext<SayHelloEmbeddable>) {
    this.sayHello(`Hello, ${context.embeddable.getOutput().name}`);
  }
}
