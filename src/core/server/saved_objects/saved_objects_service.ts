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

import { CoreService } from 'src/core/types';
import { first } from 'rxjs/operators';
import { KibanaMigrator, KibanaMigratorContract } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceSetup } from '../legacy/legacy_service';
import { ElasticsearchServiceSetup } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { retryCallCluster } from '../elasticsearch/retry_call_cluster';
import { SavedObjectsConfigType } from './saved_objects_config';
import { Logger } from '..';

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsServiceSetup {}

/**
 * @public
 */
export interface SavedObjectsServiceStart {
  migrator: KibanaMigratorContract;
}

/** @internal */
export interface SavedObjectsSetupDeps {
  legacy: LegacyServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsStartDeps {}

export class SavedObjectsService
  implements CoreService<SavedObjectsServiceSetup, SavedObjectsServiceStart> {
  private migrator: KibanaMigrator | undefined;
  logger: Logger;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
  }

  public async setup(coreSetup: SavedObjectsSetupDeps) {
    this.logger.debug('Setting up SavedObjects service');

    const {
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
    } = await coreSetup.legacy.uiExports;

    const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(first()).toPromise();

    const kibanaConfig = await this.coreContext.configService
      .atPath<KibanaConfigType>('kibana')
      .pipe(first())
      .toPromise();

    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('migrations')
      .pipe(first())
      .toPromise();

    this.migrator = new KibanaMigrator({
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
      logger: this.coreContext.logger.get('migrations'),
      kibanaVersion: this.coreContext.env.packageInfo.version,
      config: coreSetup.legacy.pluginExtendedConfig,
      savedObjectsConfig,
      kibanaConfig,
      callCluster: retryCallCluster(adminClient.callAsInternalUser.bind(adminClient)),
    });

    return ({} as any) as Promise<SavedObjectsServiceSetup>;
  }

  public async start(core: SavedObjectsStartDeps): Promise<SavedObjectsServiceStart> {
    this.logger.debug('Starting SavedObjects service');

    /**
     * Note: We want to ensure that migrations have completed before
     * continuing with further Core startup steps that might use SavedObjects
     * such as running the legacy server, legacy plugins and allowing incoming
     * HTTP requests.
     *
     * However, our build system optimize step and some tests depend on the
     * HTTP server running without an Elasticsearch server being available.
     * So, when the `migrations.skip` is true, we skip migrations altogether.
     */
    const cliArgs = this.coreContext.env.cliArgs;
    const savedObjectsConfig = await this.coreContext.configService
      .atPath<SavedObjectsConfigType>('migrations')
      .pipe(first())
      .toPromise();
    const skipMigrations = cliArgs.optimize || savedObjectsConfig.skip;
    await this.migrator!.awaitMigration(skipMigrations);

    return { migrator: this.migrator! };
  }

  public async stop() {}
}
