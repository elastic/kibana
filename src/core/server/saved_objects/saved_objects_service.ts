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
import { take, retryWhen, concatMap } from 'rxjs/operators';
// import {
//   SavedObjectsClient,
//   SavedObjectsSchema,
//   SavedObjectsRepository,
//   SavedObjectsSerializer,
//   ScopedSavedObjectsClientProvider,
// } from './';
// import { SavedObjectsClientContract } from './types';
// import { getRootPropertiesObjects } from './mappings';

import { defer, throwError, iif, timer } from 'rxjs';
import elasticsearch from 'elasticsearch';
import { KibanaMigrator } from './migrations';
import { CoreContext } from '../core_context';
import { LegacyServiceSetup } from '../legacy/legacy_service';
import { ElasticsearchServiceSetup, CallAPIOptions } from '../elasticsearch';

// @ts-ignore
import { Config } from '../../../legacy/server/config/config';
import { KibanaConfig } from '../kibana_config';
// import { Env } from '../config';

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
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDeps {}

export interface SetupDeps {
  legacy: LegacyServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

export class SavedObjectsService
  implements CoreService<SavedObjectsServiceSetup, SavedObjectsServiceStart> {
  private migrator: KibanaMigrator | undefined;
  constructor(private readonly coreContext: CoreContext) {}

  public async setup(coreSetup: SetupDeps) {
    // TODO: Register savedObjectsClient to http service's request context
    const {
      savedObjectSchemas,
      savedObjectMappings,
      savedObjectMigrations,
      savedObjectValidations,
    } = await coreSetup.legacy.uiExports;

    const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();

    const retryCallCluster = (
      endpoint: string,
      clientParams: Record<string, any> = {},
      options?: CallAPIOptions
    ) => {
      return defer(() => adminClient.callAsInternalUser(endpoint, clientParams, options))
        .pipe(
          retryWhen(errors =>
            errors.pipe(
              concatMap((error, i) =>
                iif(
                  () => error instanceof elasticsearch.errors.NoConnections,
                  timer(1000),
                  throwError(error)
                )
              )
            )
          )
        )
        .toPromise();
    };

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
      callCluster: retryCallCluster,
    });

    // const mappings = migrator.getActiveMappings();
    // const allTypes = Object.keys(getRootPropertiesObjects(mappings));
    // const schema = new SavedObjectsSchema(savedObjectSchemas);
    // const serializer = new SavedObjectsSerializer(schema);
    // const visibleTypes = allTypes.filter(type => !schema.isHiddenType(type));

    // const provider = new ScopedSavedObjectsClientProvider({
    //   defaultClientFactory({ request }) {
    //     const repository = new SavedObjectsRepository({
    //       index: config.get('kibana.index'),
    //       config,
    //       migrator,
    //       mappings,
    //       schema,
    //       serializer,
    //       allowedTypes: visibleTypes,
    //       callCluster: adminClient.asScoped(request).callAsCurrentUser as CallCluster,
    //     });

    //     return new SavedObjectsClient(repository);
    //   },
    // });

    return ({} as any) as Promise<SavedObjectsServiceSetup>;
  }

  public async start(core: StartDeps): Promise<SavedObjectsServiceStart> {
    // Start migrations, but don't wait for them to complete
    this.migrator!.awaitMigration();
    return { migrator: this.migrator as KibanaMigrator };
  }

  public async stop() {}
}
