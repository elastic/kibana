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

import { CoreSetup, CoreStart, Logger, PluginInitializerContext } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Payload as ErrorPayload } from 'src/core/server/pulse/collectors/errors';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { PulseChannel } from 'src/core/server/pulse/channel';

class Plugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const errorsChannel = core.pulse.getChannel('errors');
    if (errorsChannel) {
      // Catch any uncaught error and push it to Pulse before quitting.
      process.setUncaughtExceptionCaptureCallback(error => this.handleError(errorsChannel, error));
      process.on('unhandledRejection', error => this.handleError(errorsChannel, error));

      // TODO: Intercept the logger 'fatal'-level errors
    }
  }

  public start(core: CoreStart) {}

  public stop() {}

  private async handleError(errorsChannel: PulseChannel, error: Error) {
    const errorPayload: ErrorPayload = {
      hash: error.message, // TODO: Find a way to hash the message
      message: error.message,
      status: 'new',
    };
    try {
      await errorsChannel.sendPulse(errorPayload);
    } finally {
      this.log.fatal(error);
      process.exit(1);
    }
  }
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
