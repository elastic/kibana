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
import { takeUntil } from 'rxjs/operators';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { PulseChannel } from 'src/core/public/pulse/channel';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ErrorInstruction } from 'src/core/server/pulse/collectors/errors';
import { errorChannelPayloads } from './mock_data/errors';

export class PulseErrorsPlugin implements Plugin<PulseErrorsPluginSetup, PulseErrorsPluginStart> {
  private readonly stop$ = new Subject();
  private instructionsSubscription?: Subscription;
  private noFixedVersionsSeen: Set<string> = new Set();
  private errorsChannel?: PulseChannel<ErrorInstruction>;

  public async setup(core: CoreSetup) {
    const errorsChannel = core.pulse.getChannel<ErrorInstruction>('errors');
    this.errorsChannel = errorsChannel;
    errorChannelPayloads.forEach(element => errorsChannel.sendPulse(element));
  }

  public start(core: CoreStart) {
    if (!this.errorsChannel) {
      throw Error('unable to find errors channel');
    }

    this.instructionsSubscription = this.errorsChannel
      .instructions$()
      .pipe(takeUntil(this.stop$))
      .subscribe(instructions => {
        if (instructions && instructions.length) {
          instructions.forEach((instruction: any) => {
            // @ts-ignore-next-line this should be refering to the instruction, not the raw es document
            if (instruction) {
              if (!instruction.fixedVersion && !this.noFixedVersionsSeen.has(instruction.hash))
                core.notifications.toasts.addError(new Error(JSON.stringify(instruction)), {
                  // @ts-ignore-next-line
                  title: `Error:${instruction.hash}`,
                  toastMessage: `An error occurred: ${instruction.message}. The error has been reported to Pulse`,
                });
              this.noFixedVersionsSeen.add(instruction.hash);
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
