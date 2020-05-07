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

import { resolveInstanceUuid } from './resolve_uuid';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { IConfigService, CliArgs } from '../config';

/**
 * APIs to access the application's instance uuid.
 *
 * @public
 */
export interface UuidServiceSetup {
  /**
   * Retrieve the Kibana instance uuid.
   */
  getInstanceUuid(): string;
}

/** @internal */
export class UuidService {
  private readonly log: Logger;
  private readonly configService: IConfigService;
  private readonly cliArgs: CliArgs;
  private uuid: string = '';

  constructor(core: CoreContext) {
    this.log = core.logger.get('uuid');
    this.configService = core.configService;
    this.cliArgs = core.env.cliArgs;
  }

  public async setup() {
    this.uuid = await resolveInstanceUuid({
      configService: this.configService,
      syncToFile: !this.cliArgs.optimize,
      logger: this.log,
    });

    return {
      getInstanceUuid: () => this.uuid,
    };
  }
}
