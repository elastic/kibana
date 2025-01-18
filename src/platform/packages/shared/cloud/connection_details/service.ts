/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ApiKey } from './tabs/api_keys_tab/views/success_form/types';
import type { Format } from './tabs/api_keys_tab/views/success_form/format_select';
import type { ConnectionDetailsOpts, TabID, ConnectionDetailsTelemetryEvents } from './types';

export class ConnectionDetailsService {
  public readonly tabId$ = new BehaviorSubject<TabID>('endpoints');
  public readonly showCloudId$ = new BehaviorSubject<boolean>(false);
  public readonly apiKeyName$ = new BehaviorSubject<string>('');
  public readonly apiKeyStatus$ = new BehaviorSubject<'configuring' | 'creating'>('configuring');
  public readonly apiKeyError$ = new BehaviorSubject<Error | unknown | undefined>(undefined);
  public readonly apiKey$ = new BehaviorSubject<ApiKey | null>(null);
  public readonly apiKeyFormat$ = new BehaviorSubject<Format>('encoded');
  public readonly apiKeyHasAccess$ = new BehaviorSubject<null | boolean>(null);

  constructor(public readonly opts: ConnectionDetailsOpts) {
    opts.apiKeys
      ?.hasPermission()
      .then((hasAccess) => {
        this.apiKeyHasAccess$.next(hasAccess);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error checking API key creation permissions', error);
      });
  }

  public readonly setTab = (tab: TabID) => {
    this.tabId$.next(tab);
  };

  public readonly toggleShowCloudId = () => {
    this.emitTelemetryEvent(['show_cloud_id_toggled']);
    this.showCloudId$.next(!this.showCloudId$.getValue());
  };

  public readonly setApiKeyName = (name: string) => {
    this.apiKeyName$.next(name);
    this.apiKeyError$.next(undefined);
  };

  public readonly setApiKeyFormat = (format: Format) => {
    this.emitTelemetryEvent(['key_encoding_changed', { format }]);
    this.apiKeyFormat$.next(format);
  };

  private validateName = () => {
    const name = this.apiKeyName$.getValue();

    if (!name) {
      const message = i18n.translate('cloud.connectionDetails.tab.apiKeys.nameField.missingError', {
        defaultMessage: 'API key name is required.',
      });
      throw new Error(message);
    }
  };

  private readonly createKeyAsync = async () => {
    const createKey = this.opts.apiKeys?.createKey;

    if (!createKey) {
      throw new Error('createKey() is not implemented');
    }

    this.apiKeyStatus$.next('creating');
    try {
      this.validateName();
      const { apiKey } = await createKey({
        name: this.apiKeyName$.getValue(),
      });
      this.apiKey$.next(apiKey);
      this.emitTelemetryEvent(['new_api_key_created']);
    } catch (error) {
      this.apiKeyError$.next(error);
    } finally {
      this.apiKeyStatus$.next('configuring');
    }
  };

  public readonly createKey = () => {
    this.createKeyAsync().catch((error) => {
      this.apiKeyError$.next(error);
    });
  };

  public readonly emitTelemetryEvent = (event: ConnectionDetailsTelemetryEvents) => {
    try {
      this.opts.onTelemetryEvent?.(event);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error emitting telemetry event', error);
    }
  };
}
