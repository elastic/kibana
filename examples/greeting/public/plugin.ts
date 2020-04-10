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

export interface Greeter {
  greetMe: (name: string) => void;
  label: string;
}

type GreetingProvider = (def: GreetingDefinition) => Greeter;

const defaultGreetingProvider: GreetingProvider = (def: GreetingDefinition) => ({
  greetMe: (name: string) => alert(`${def.salutation} ${name}${def.punctuation}`),
  label: def.id,
});

export interface GreetingStart {
  /**
   * This function should be used if the value of `id` is not known at compile time. Usually
   * this is because `id` has been persisted somewhere. If the value of `id` is known at
   * compile time (e.g. `greeting.getGreeter(CASUAL_GREETER))`) developers should prefer accessing
   * off the plugin that registered `CasualGreeter`, like `customGreetings.getCasualGreeter()`, because:
   *  - makes it more explicit you should add `customGreetings` to your plugin dependency list.
   *  - don't need to handle the possibility of `undefined` if it's a required dependency.
   *  - can get more specialized types in certain situations (e.g. `interface CustomGreeter` vs `Greeter` -
   * does not apply to this example but many real world examples are like this.)
   */
  getGreeter: (id: string) => Greeter;
  /**
   * Returns an array of all registered greeters.
   */
  getGreeters: () => Greeter[];
}

export interface GreetingSetup {
  /**
   * Allows for another plugin to add a custom provider. Only one plugin is allowed to set a custom
   * provider, any secondary attempts will result in an error.
   */
  setCustomProvider: (customProvider: GreetingProvider) => void;

  /**
   * Returns a greeting accessor that should only be used after the setup lifecycle completes.
   */
  registerGreetingDefinition: (greetingDefinition: GreetingDefinition) => () => Greeter;
}

export class GreetingPlugin implements Plugin<GreetingSetup, GreetingStart> {
  private greetingDefinitions: { [key: string]: GreetingDefinition } = {};
  /**
   * Greeting provider is set at the beginning of this plugins start lifecycle to ensure
   * any other plugins had a chance to set a custom provider.
   */
  private greetingProvider?: GreetingProvider;

  /**
   * Store a custom provider set by another plugin.
   */
  private customGreetingProvider?: GreetingProvider;

  setup = () => ({
    /**
     * TODO: this only allows for a single greeting provider to be set. It would be nice
     * to come up with a pattern that allowed for multiple custom providers to be registered.
     */
    setCustomProvider: (customProvider: GreetingProvider) => {
      if (this.customGreetingProvider) {
        throw new Error(
          'Only one custom greeting provider is allowed, and one has already been registered.'
        );
      } else {
        this.customGreetingProvider = customProvider;
      }
    },
    registerGreetingDefinition: (greetingDefinition: GreetingDefinition) => {
      this.greetingDefinitions[greetingDefinition.id] = greetingDefinition;
      return () => {
        if (!this.greetingProvider) {
          throw new Error('Greeters can only be retrieved after setup lifecycle.');
        } else {
          return this.greetingProvider(greetingDefinition);
        }
      };
    },
  });

  start() {
    this.greetingProvider = this.customGreetingProvider || defaultGreetingProvider;
    return {
      getGreeter: (id: string) => this.greetingProvider!(this.greetingDefinitions[id]),

      getGreeters: () => Object.values(this.greetingDefinitions).map(this.greetingProvider!),
    };
  }
}
