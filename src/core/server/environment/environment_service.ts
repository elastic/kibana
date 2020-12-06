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

import { take } from 'rxjs/operators';
import { PathConfigType, config as pathConfigDef } from '@kbn/utils';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { IConfigService } from '../config';
import { HttpConfigType, config as httpConfigDef } from '../http';
import { PidConfigType, config as pidConfigDef } from './pid_config';
import { resolveInstanceUuid } from './resolve_uuid';
import { createDataFolder } from './create_data_folder';
import { writePidFile } from './write_pid_file';

/**
 * @internal
 */
export interface InternalEnvironmentServiceSetup {
  /**
   * Retrieve the Kibana instance uuid.
   */
  instanceUuid: string;
}

/** @internal */
export class EnvironmentService {
  private readonly log: Logger;
  private readonly configService: IConfigService;
  private uuid: string = '';

  constructor(core: CoreContext) {
    this.log = core.logger.get('environment');
    this.configService = core.configService;
  }

  public async setup() {
    const [pathConfig, serverConfig, pidConfig] = await Promise.all([
      this.configService.atPath<PathConfigType>(pathConfigDef.path).pipe(take(1)).toPromise(),
      this.configService.atPath<HttpConfigType>(httpConfigDef.path).pipe(take(1)).toPromise(),
      this.configService.atPath<PidConfigType>(pidConfigDef.path).pipe(take(1)).toPromise(),
    ]);

    // was present in the legacy `pid` file.
    process.on('unhandledRejection', (reason) => {
      this.log.warn(`Detected an unhandled Promise rejection.\n${reason}`);
    });

    await createDataFolder({ pathConfig, logger: this.log });
    await writePidFile({ pidConfig, logger: this.log });

    this.uuid = await resolveInstanceUuid({
      pathConfig,
      serverConfig,
      logger: this.log,
    });

    return {
      instanceUuid: this.uuid,
    };
  }
}
