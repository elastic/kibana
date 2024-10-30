/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient } from '@kbn/core-elasticsearch-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type {
  FakeRawRequest,
  Headers,
  HttpServiceSetup,
  IBasePath,
  KibanaRequest,
} from '@kbn/core-http-server';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import type { Logger } from '@kbn/logging';
import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { ScreenshottingStart } from '@kbn/screenshotting-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import type { CreateJobFn, RunTaskFn } from './types';
import type { ReportingConfigType } from '.';

export interface BaseExportTypeSetupDeps {
  basePath: Pick<IBasePath, 'set'>;
  spaces?: SpacesPluginSetup;
}

export interface BaseExportTypeStartDeps {
  savedObjects: SavedObjectsServiceStart;
  uiSettings: UiSettingsServiceStart;
  esClient: IClusterClient;
  screenshotting?: ScreenshottingStart;
}

export abstract class ExportType<
  JobParamsType extends object = any,
  TaskPayloadType extends object = any,
  SetupDepsType extends BaseExportTypeSetupDeps = BaseExportTypeSetupDeps,
  StartDepsType extends BaseExportTypeStartDeps = BaseExportTypeStartDeps
> {
  abstract id: string; // ID for exportTypesRegistry.getById()
  abstract name: string; // user-facing string
  abstract jobType: string; // for job params

  abstract jobContentEncoding?: 'base64' | 'csv';
  abstract jobContentExtension: 'pdf' | 'png' | 'csv';

  abstract createJob: CreateJobFn<JobParamsType, TaskPayloadType>;
  abstract runTask: RunTaskFn<TaskPayloadType>;

  abstract validLicenses: LicenseType[];

  public setupDeps!: SetupDepsType;
  public startDeps!: StartDepsType;
  public http!: HttpServiceSetup;

  constructor(
    core: CoreSetup,
    public config: ReportingConfigType,
    public logger: Logger,
    public context: PluginInitializerContext<ReportingConfigType>
  ) {
    this.http = core.http;
  }

  setup(setupDeps: SetupDepsType) {
    this.setupDeps = setupDeps;
  }
  start(startDeps: StartDepsType) {
    this.startDeps = startDeps;
  }

  private async getSavedObjectsClient(request: KibanaRequest) {
    const { savedObjects } = this.startDeps;
    return savedObjects.getScopedClient(request) as SavedObjectsClientContract;
  }

  private getSpaceId(request: KibanaRequest, logger = this.logger): string | undefined {
    const spacesService = this.setupDeps.spaces?.spacesService;
    if (spacesService) {
      const spaceId = spacesService?.getSpaceId(request);

      if (spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Request uses Space ID: ${spaceId}`);
        return spaceId;
      } else {
        logger.debug(`Request uses default Space`);
      }
    }
  }

  // needed to be protected vs private for the csv search source immediate export type
  protected getUiSettingsServiceFactory(savedObjectsClient: SavedObjectsClientContract) {
    const { uiSettings: uiSettingsService } = this.startDeps;
    const scopedUiSettingsService = uiSettingsService.asScopedToClient(savedObjectsClient);
    return scopedUiSettingsService;
  }

  protected async getUiSettingsClient(request: KibanaRequest, logger = this.logger) {
    const spacesService = this.setupDeps.spaces?.spacesService;
    const spaceId = this.getSpaceId(request, logger);

    if (spacesService && spaceId) {
      logger.info(`Creating UI Settings Client for space: ${spaceId}`);
    }
    const savedObjectsClient = await this.getSavedObjectsClient(request);
    return this.getUiSettingsServiceFactory(savedObjectsClient);
  }

  protected getFakeRequest(
    headers: Headers,
    spaceId: string | undefined,
    logger = this.logger
  ): KibanaRequest {
    const rawRequest: FakeRawRequest = {
      headers,
      path: '/',
    };
    const fakeRequest = CoreKibanaRequest.from(rawRequest);

    const spacesService = this.setupDeps.spaces?.spacesService;
    if (spacesService) {
      if (spaceId && spaceId !== DEFAULT_SPACE_ID) {
        logger.info(`Generating request for space: ${spaceId}`);
        this.setupDeps.basePath.set(fakeRequest, `/s/${spaceId}`);
      }
    }
    return fakeRequest;
  }

  /*
   * Returns configurable server info
   */
  protected getServerInfo(): ReportingServerInfo {
    const serverInfo = this.http.getServerInfo();
    return {
      basePath: this.http.basePath.serverBasePath,
      hostname: serverInfo.hostname,
      name: serverInfo.name,
      port: serverInfo.port,
      uuid: this.context.env.instanceUuid,
      protocol: serverInfo.protocol,
    };
  }
}
