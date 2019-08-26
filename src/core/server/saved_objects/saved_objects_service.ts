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
import { take } from 'rxjs/operators';
import { KibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceSetup } from '../legacy/legacy_service';
import { ElasticsearchServiceSetup } from '../elasticsearch';
import { KibanaConfig } from '../kibana_config';
import { retryCallCluster } from '../elasticsearch/retry_call_cluster';

/**
 * @public
 */
export interface SavedObjectsServiceStart {
  migrator: Pick<KibanaMigrator, keyof KibanaMigrator>;
}

/**
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsServiceSetup {}

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SavedObjectsStartDeps {}

/** @internal */
export interface SavedObjectsSetupDeps {
  legacy: LegacyServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

export class SavedObjectsService
  implements CoreService<SavedObjectsServiceSetup, SavedObjectsServiceStart> {
  private migrator: KibanaMigrator | undefined;

  constructor(private readonly coreContext: CoreContext) {}

  public async setup(coreSetup: SavedObjectsSetupDeps) {
    const {
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
    } = await coreSetup.legacy.uiExports;

    const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();

    // const kibanaConfig = await this.coreContext.configService
    //   .atPath<KibanaConfig>('kibana')
    //   .toPromise(); <-- No idea why, but this makes Node.js process exit without any errors or hints to what went wrong ??
    let kibanaConfig;
    this.coreContext.configService.atPath<KibanaConfig>('kibana').subscribe(value => {
      kibanaConfig = value;
    });

    this.migrator = new KibanaMigrator({
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
      logger: this.coreContext.logger.get('migrations'),
      kibanaVersion: this.coreContext.env.packageInfo.version,
      config: coreSetup.legacy.pluginExtendedConfig,
      kibanaConfig: (kibanaConfig as any) as KibanaConfig,
      callCluster: retryCallCluster(adminClient.callAsInternalUser.bind(adminClient)),
    });

    return ({} as any) as Promise<SavedObjectsServiceSetup>;
  }

  public async start(core: SavedObjectsStartDeps): Promise<SavedObjectsServiceStart> {
    /**
     * Note: We want to ensure that migrations have completed before
     * continuing with further Core startup steps that might use SavedObjects
     * such as running the legacy server, legacy plugins and allowing incoming
     * HTTP requests.
     *
     * However, our build system optimize step and some tests depend on the
     * HTTP server running without an Elasticsearch server being available.
     * So, when the `--skip-migrations` flag is true, we skip migrations all-
     * together.
     */
    const cliArgs = this.coreContext.env.cliArgs;
    const skipMigrations = cliArgs.optimize || cliArgs.skipMigrations;
    await this.migrator!.awaitMigration(skipMigrations);

    return { migrator: this.migrator as KibanaMigrator };
  }

  public async stop() {}
}
