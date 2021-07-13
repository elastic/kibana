/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export interface InternalEnvironmentServicePreboot {
  /**
   * Retrieve the Kibana instance uuid.
   */
  instanceUuid: string;
}

/**
 * @internal
 */
export type InternalEnvironmentServiceSetup = InternalEnvironmentServicePreboot;

/** @internal */
export class EnvironmentService {
  private readonly log: Logger;
  private readonly processLogger: Logger;
  private readonly configService: IConfigService;
  private uuid: string = '';

  constructor(core: CoreContext) {
    this.log = core.logger.get('environment');
    this.processLogger = core.logger.get('process');
    this.configService = core.configService;
  }

  public async preboot() {
    // IMPORTANT: This code is based on the assumption that none of the configuration values used
    // here is supposed to change during preboot phase and it's safe to read them only once.
    const [pathConfig, serverConfig, pidConfig] = await Promise.all([
      this.configService.atPath<PathConfigType>(pathConfigDef.path).pipe(take(1)).toPromise(),
      this.configService.atPath<HttpConfigType>(httpConfigDef.path).pipe(take(1)).toPromise(),
      this.configService.atPath<PidConfigType>(pidConfigDef.path).pipe(take(1)).toPromise(),
    ]);

    // was present in the legacy `pid` file.
    process.on('unhandledRejection', (reason) => {
      this.log.warn(`Detected an unhandled Promise rejection.\n${reason}`);
    });

    process.on('warning', (warning) => {
      // deprecation warnings do no reflect a current problem for the user and should be filtered out.
      if (warning.name === 'DeprecationWarning') {
        return;
      }
      this.processLogger.warn(warning);
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

  public setup() {
    return {
      instanceUuid: this.uuid,
    };
  }
}
