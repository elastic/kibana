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
import {
  SavedObjectsClient,
  SavedObjectsSchema,
  SavedObjectsRepository,
  SavedObjectsSerializer,
  SavedObjectsClientProvider,
  ISavedObjectsClientProvider,
} from './';
import { getRootPropertiesObjects } from './mappings';
import { KibanaMigrator, IKibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceSetup } from '../legacy/legacy_service';
import { ElasticsearchServiceSetup } from '../elasticsearch';
import { KibanaConfigType } from '../kibana_config';
import { retryCallCluster } from '../elasticsearch/retry_call_cluster';
import { SavedObjectsConfigType } from './saved_objects_config';
import { KibanaRequest } from '../http';
import { Logger } from '..';

/**
 * @public
 */
export interface SavedObjectsServiceSetup {
  clientProvider: ISavedObjectsClientProvider;
}

/**
 * @public
 */
export interface SavedObjectsServiceStart {
  migrator: IKibanaMigrator;
  clientProvider: ISavedObjectsClientProvider;
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
  private logger: Logger;
  private clientProvider: ISavedObjectsClientProvider<KibanaRequest> | undefined;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('savedobjects-service');
  }

  public async setup(coreSetup: SavedObjectsSetupDeps): Promise<SavedObjectsServiceSetup> {
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

    const migrator = (this.migrator = new KibanaMigrator({
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
      logger: this.coreContext.logger.get('migrations'),
      kibanaVersion: this.coreContext.env.packageInfo.version,
      config: coreSetup.legacy.pluginExtendedConfig,
      savedObjectsConfig,
      kibanaConfig,
      callCluster: retryCallCluster(adminClient.callAsInternalUser),
    }));

    const mappings = this.migrator.getActiveMappings();
    const allTypes = Object.keys(getRootPropertiesObjects(mappings));
    const schema = new SavedObjectsSchema(savedObjectSchemas);
    const serializer = new SavedObjectsSerializer(schema);
    const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));

    this.clientProvider = new SavedObjectsClientProvider<KibanaRequest>({
      defaultClientFactory({ request }) {
        const repository = new SavedObjectsRepository({
          index: kibanaConfig.index,
          config: coreSetup.legacy.pluginExtendedConfig,
          migrator,
          mappings,
          schema,
          serializer,
          allowedTypes: visibleTypes,
          callCluster: retryCallCluster(adminClient.asScoped(request).callAsCurrentUser),
        });

        return new SavedObjectsClient(repository);
      },
    });

    return {
      clientProvider: this.clientProvider,
    };
  }

  public async start(core: SavedObjectsStartDeps): Promise<SavedObjectsServiceStart> {
    if (!this.clientProvider) {
      throw new Error('#setup() needs to be run first');
    }

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
    await this.migrator!.runMigrations(skipMigrations);

    return {
      migrator: this.migrator!,
      clientProvider: this.clientProvider,
    };
  }

  public async stop() {}
}
