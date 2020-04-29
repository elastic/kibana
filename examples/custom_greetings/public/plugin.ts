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

import { CoreSetup, Plugin } from 'kibana/public';

import { GreetingStart, GreetingSetup, Greeting } from 'examples/greeting/public';

interface SetupDependencies {
  greeting: GreetingSetup;
}

interface StartDependencies {
  greeting: GreetingStart;
}

/**
 * Expose direct access to specific greeter implementations on the start contract.
 * If a plugin knows ahead of time which specific implementation they would like to access
 * they should access it directly off this plugin as opposed to retrieving it off the
 * generic registry, via `greeting.getGreeter('Casual')`.
 */
export interface CustomGreetingsStart {
  getCasualGreeter: () => Greeting;
  getExcitedGreeter: () => Greeting;
  getFormalGreeter: () => Greeting;
}

export class CustomGreetingsPlugin
  implements Plugin<void, CustomGreetingsStart, SetupDependencies, StartDependencies> {
  private casualGreeterProvider?: () => Greeting;
  private excitedGreeterProvider?: () => Greeting;
  private formalGreeterProvider?: () => Greeting;

  setup(core: CoreSetup<StartDependencies>, { greeting }: SetupDependencies) {
    this.casualGreeterProvider = greeting.registerGreetingDefinition({
      id: 'Casual',
      salutation: 'Hey there',
      punctuation: '.',
    });
    this.excitedGreeterProvider = greeting.registerGreetingDefinition({
      id: 'Excited',
      salutation: 'Hi',
      punctuation: '!!',
    });
    this.formalGreeterProvider = greeting.registerGreetingDefinition({
      id: 'Formal',
      salutation: 'Hello ',
      punctuation: '.',
    });
  }

  start() {
    const { casualGreeterProvider, excitedGreeterProvider, formalGreeterProvider } = this;
    if (!casualGreeterProvider || !excitedGreeterProvider || !formalGreeterProvider) {
      throw new Error('Something unexpected went wrong. Greeters should be defined by now.');
    }
    return {
      getCasualGreeter: () => casualGreeterProvider(),
      getExcitedGreeter: () => excitedGreeterProvider(),
      getFormalGreeter: () => formalGreeterProvider(),
    };
  }
}
