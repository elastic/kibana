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
import React from 'react';
import { EuiModalBody } from '@elastic/eui';

import { toMountPoint } from '../../../src/plugins/kibana_react/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { GreetingSetup, GreetingDefinition } from '../../greeting/public';

interface SetupDependencies {
  greeting: GreetingSetup;
}

export class GreetingEnhancedPlugin implements Plugin<void, void, SetupDependencies> {
  private startServices?: { overlays: CoreStart['overlays'] };

  setup(core: CoreSetup, { greeting }: SetupDependencies) {
    greeting.setCustomProvider((def: GreetingDefinition) => ({
      greetMe: (name: string) =>
        this.getStartServices().overlays.openModal(
          toMountPoint(<EuiModalBody>{`${def.salutation} ${name}${def.punctuation}`}</EuiModalBody>)
        ),
    }));
  }

  start(core: CoreStart) {
    this.startServices = { overlays: core.overlays };
  }

  getStartServices() {
    if (!this.startServices) {
      throw new Error('Accessing start services before they have been initialized');
    }
    return this.startServices;
  }
}
