/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { KbnClientImportExport } from './kbn_client_import_export';
import { KbnClientPlugins } from './kbn_client_plugins';
import { KbnClientRequester, ReqOptions } from './kbn_client_requester';
import { KbnClientSavedObjects } from './kbn_client_saved_objects';
import { KbnClientSpaces } from './kbn_client_spaces';
import { KbnClientStatus } from './kbn_client_status';
import { KbnClientUiSettings, UiSettingValues } from './kbn_client_ui_settings';
import { KbnClientVersion } from './kbn_client_version';

export interface KbnClientOptions {
  url: string;
  certificateAuthorities?: Buffer[];
  log: ToolingLog;
  uiSettingDefaults?: UiSettingValues;
  importExportBaseDir?: string;
}

export class KbnClient {
  readonly status: KbnClientStatus;
  readonly plugins: KbnClientPlugins;
  readonly version: KbnClientVersion;
  readonly savedObjects: KbnClientSavedObjects;
  readonly spaces: KbnClientSpaces;
  readonly uiSettings: KbnClientUiSettings;
  readonly importExport: KbnClientImportExport;

  private readonly requester: KbnClientRequester;
  private readonly log: ToolingLog;
  private readonly uiSettingDefaults?: UiSettingValues;

  /**
   * Basic Kibana server client that implements common behaviors for talking
   * to the Kibana server from dev tooling.
   */
  constructor(options: KbnClientOptions) {
    if (!options.url) {
      throw new Error('missing Kibana url');
    }
    if (!options.log) {
      throw new Error('missing ToolingLog');
    }

    this.log = options.log;
    this.uiSettingDefaults = options.uiSettingDefaults;

    this.requester = new KbnClientRequester(this.log, {
      url: options.url,
      certificateAuthorities: options.certificateAuthorities,
    });
    this.status = new KbnClientStatus(this.requester);
    this.plugins = new KbnClientPlugins(this.status);
    this.version = new KbnClientVersion(this.status);
    this.savedObjects = new KbnClientSavedObjects(this.log, this.requester);
    this.spaces = new KbnClientSpaces(this.requester);
    this.uiSettings = new KbnClientUiSettings(this.log, this.requester, this.uiSettingDefaults);
    this.importExport = new KbnClientImportExport(
      this.log,
      this.requester,
      this.savedObjects,
      options.importExportBaseDir
    );
  }

  /**
   * Make a direct request to the Kibana server
   */
  async request<T>(options: ReqOptions) {
    return await this.requester.request<T>(options);
  }

  resolveUrl(relativeUrl: string) {
    return this.requester.resolveUrl(relativeUrl);
  }
}
