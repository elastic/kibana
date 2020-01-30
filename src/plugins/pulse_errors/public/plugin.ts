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

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import { Subject, Subscription } from 'rxjs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { takeUntil } from 'rxjs/operators';
import { errorChannelPayloads } from './mock_data/errors';

export class PulseErrorsPlugin implements Plugin<PulseErrorsPluginSetup, PulseErrorsPluginStart> {
  private readonly stop$ = new Subject();
  private instructionsSubscription?: Subscription;
  private noFxedVersionsSeen: Set<string> = new Set(); // TODO: possibly change this to a map later to store more detailed info.
  constructor() {}

  public async setup(core: CoreSetup) {
    errorChannelPayloads.forEach(element => core.pulse.getChannel('errors').sendPulse(element));
  }

  public start(core: CoreStart) {
    this.instructionsSubscription = core.pulse
      .getChannel('errors')
      .instructions$()
      .pipe(takeUntil(this.stop$))
      .subscribe(instructions => {
        // TODO: clean up all these nested if statements, they're not pretty
        // general check on if we have any instructions
        if (instructions && instructions.length) {
          instructions.forEach((instruction: any) => {
            // see if the array actually contains a doc and isn't null
            if (instruction) {
              // No fixed versions yet: check specifically for toast notifications -> this will move to a switch later
              if (
                instruction.sendTo === 'toasts' &&
                !this.noFxedVersionsSeen.has(instruction.hash)
              ) {
                // show the instruction as a toast
                core.notifications.toasts.addError(new Error(JSON.stringify(instruction)), {
                  // @ts-ignore-next-line
                  title: `Error:${instruction.hash}`,
                  toastMessage: `An error occurred: ${instruction.message}. Pulse message:${instruction.pulseMessage}`,
                });
                // add it to the 'seen' Set
                this.noFxedVersionsSeen.add(instruction.hash);
              }
            }
          });
        }
      });
  }

  public stop() {
    this.stop$.next();
    if (this.instructionsSubscription) this.instructionsSubscription.unsubscribe();
  }
}

export type PulseErrorsPluginSetup = ReturnType<PulseErrorsPlugin['setup']>;
export type PulseErrorsPluginStart = ReturnType<PulseErrorsPlugin['start']>;
