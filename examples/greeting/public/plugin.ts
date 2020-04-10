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

import { Plugin } from '../../../src/core/public';

export interface GreetingDefinition {
  id: string;
  salutation: string;
  punctuation: string;
}

export interface Greeting {
  greetMe: (name: string) => void;
  label: string;
}

type GreetingProvider = (def: GreetingDefinition) => Greeting;

const defaultGreetingProvider: GreetingProvider = (def: GreetingDefinition) => ({
  greetMe: (name: string) => alert(`${def.salutation} ${name}${def.punctuation}`),
  label: def.id,
});

export interface GreetingStart {
  getGreeting: (id: string) => Greeting;
  getRegisteredGreetings: () => string[];
  getRegisteredGreetingsAsObjects: () => Greeting[];
}

export interface GreetingSetup {
  setCustomProvider: (customProvider: GreetingProvider) => void;
  registerGreeting: (greetingDefinition: GreetingDefinition) => () => Greeting;
}

export class GreetingPlugin implements Plugin<GreetingSetup, GreetingStart> {
  private greetings: { [key: string]: Greeting } = {};
  private greetingDefinitions: { [key: string]: GreetingDefinition } = {};
  private greetingProvider: GreetingProvider = defaultGreetingProvider;

  setup = () => ({
    setCustomProvider: (customProvider: GreetingProvider) =>
      (this.greetingProvider = customProvider),
    registerGreeting: (greetingDefinition: GreetingDefinition) => {
      this.greetingDefinitions[greetingDefinition.id] = greetingDefinition;
      return () => this.greetingProvider(greetingDefinition);
    },
  });

  start() {
    Object.values(this.greetingDefinitions).forEach(
      greetingDefinition =>
        (this.greetings[greetingDefinition.id] = this.greetingProvider(greetingDefinition))
    );
    return {
      getGreeting: (id: string) => this.greetings[id],
      getRegisteredGreetings: () => Object.keys(this.greetings),
      getRegisteredGreetingsAsObjects: () => Object.values(this.greetings),
    };
  }
}
