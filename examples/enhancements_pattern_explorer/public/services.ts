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

import { GreetingStart } from '../../greeting/public';

export interface Services {
  greetWithGreeter: (id: string, name: string) => void;
  getGreeterIds: () => string[];
}

/**
 * Rather than pass down depencies directly, we add some indirection with this services file, to help decouple and
 * buffer this plugin from any changes in dependency contracts.
 * @param dependencies
 */
export const getServices = (dependencies: { greetingServices: GreetingStart }): Services => ({
  greetWithGreeter: (greeterId: string, name: string) => {
    const greeting = dependencies.greetingServices.getGreeting(greeterId);

    if (!greeting) {
      throw new Error(`No Greeter registered with id ${greeterId}`);
    }

    greeting.greetMe(name);
  },

  getGreeterIds: () => dependencies.greetingServices.getRegisteredGreetings(),
});
