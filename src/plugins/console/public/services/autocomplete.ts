/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';

import type { HttpSetup } from '@kbn/core/public';
import type {
  ClusterGetComponentTemplateResponse,
  IndicesGetAliasResponse,
  IndicesGetDataStreamResponse,
  IndicesGetIndexTemplateResponse,
  IndicesGetMappingResponse,
  IndicesGetTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import {
  Alias,
  DataStream,
  Mapping,
  LegacyTemplate,
  IndexTemplate,
  ComponentTemplate,
} from '../lib/autocomplete_entities';
import type { DevToolsSettings, Settings } from './settings';

export enum ENTITIES {
  INDICES = 'indices',
  FIELDS = 'fields',
  INDEX_TEMPLATES = 'indexTemplates',
  COMPONENT_TEMPLATES = 'componentTemplates',
  LEGACY_TEMPLATES = 'legacyTemplates',
  DATA_STREAMS = 'dataStreams',
}

export type SettingsToRetrieve = DevToolsSettings['autocomplete'] & {
  indexTemplates: boolean;
  componentTemplates: boolean;
  legacyTemplates: boolean;
};
type SettingsKey = keyof Omit<SettingsToRetrieve, 'templates'>;

export class AutocompleteInfo {
  public readonly alias = new Alias();
  public readonly mapping = new Mapping();
  public readonly dataStream = new DataStream();
  public readonly legacyTemplate = new LegacyTemplate();
  public readonly indexTemplate = new IndexTemplate();
  public readonly componentTemplate = new ComponentTemplate();
  private http!: HttpSetup;
  private notifications!: NotificationsSetup;
  private pollTimeoutId: ReturnType<typeof setTimeout> | undefined;

  public setup(http: HttpSetup, notifications: NotificationsSetup) {
    this.http = http;
    this.notifications = notifications;
  }

  public getEntityProvider(
    type: string,
    context: { indices: string[]; types: string[] } = { indices: [], types: [] }
  ) {
    switch (type) {
      case ENTITIES.INDICES:
        const includeAliases = true;
        const collaborator = this.mapping;
        return () => this.alias.getIndices(includeAliases, collaborator);
      case ENTITIES.FIELDS:
        return this.mapping.getMappings(context.indices, context.types);
      case ENTITIES.INDEX_TEMPLATES:
        return () => this.indexTemplate.getTemplates();
      case ENTITIES.COMPONENT_TEMPLATES:
        return () => this.componentTemplate.getTemplates();
      case ENTITIES.LEGACY_TEMPLATES:
        return () => this.legacyTemplate.getTemplates();
      case ENTITIES.DATA_STREAMS:
        return () => this.dataStream.getDataStreams();
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }

  public retrieve(settings: Settings, settingsToRetrieve: SettingsToRetrieve) {
    this.clearSubscriptions();
    const templateSettingsToRetrieve = {
      ...settingsToRetrieve,
      legacyTemplates: settingsToRetrieve.templates,
      indexTemplates: settingsToRetrieve.templates,
      componentTemplates: settingsToRetrieve.templates,
    };

    Promise.allSettled([
      this.retrieveMappings(settingsToRetrieve),
      this.retrieveAliases(settingsToRetrieve),
      this.retrieveDataStreams(settingsToRetrieve),
      this.retrieveTemplates(templateSettingsToRetrieve),
    ]).then((response) => {
      const errors = response.filter((result) => result.status === 'rejected');
      if (errors.length) {
        let path;
        // Notify the user if response size is too large
        const isResponseSizeTooLarge = errors.some((error) => {
          if ('reason' in error) {
            const url = new URL(error.reason.request?.url);
            path = url.searchParams.get('path');

            return error.reason.body?.message === 'Response size is too large';
          }
        });

        if (isResponseSizeTooLarge) {
          this.notifications.toasts.addWarning({
            title: i18n.translate('console.autocomplete.responseSizeTooLargeWarningTitle', {
              defaultMessage: `Response size for {path} is too large`,
              values: { path },
            }),
            text: i18n.translate('console.autocomplete.responseSizeTooLargeWarningText', {
              defaultMessage: 'Some autocomplete suggestions may be missing.',
            }),
          });
        }
      }

      this.pollTimeoutId = setTimeout(() => {
        // This looks strange/inefficient, but it ensures correct behavior because we don't want to send
        // a scheduled request if the user turns off polling.
        if (settings.getPolling()) {
          this.retrieve(settings, settings.getAutocomplete());
        }
      }, settings.getPollInterval());
    });
  }

  private retrieveSettings<T>(
    settingsKey: SettingsKey,
    settingsToRetrieve: SettingsToRetrieve
  ): Promise<T | {}> {
    const settingKeyToPathMap = {
      fields: '_mapping',
      indices: '_aliases',
      legacyTemplates: '_template',
      indexTemplates: '_index_template',
      componentTemplates: '_component_template',
      dataStreams: '_data_stream',
    };

    // Fetch autocomplete info if setting is enabled and if user has made changes.
    if (settingsToRetrieve[settingsKey]) {
      return this.http.get(`/api/console/autocomplete_entities`, {
        query: { path: settingKeyToPathMap[settingsKey] },
        asSystemRequest: true,
      });
    } else {
      // If the user doesn't want autocomplete suggestions, then clear any that exist
      return Promise.resolve({});
    }
  }

  private async retrieveMappings(settingsToRetrieve: SettingsToRetrieve) {
    const mappings = await this.retrieveSettings<IndicesGetMappingResponse>(
      ENTITIES.FIELDS,
      settingsToRetrieve
    );

    if (mappings) {
      this.mapping.loadMappings(mappings);
    }
  }

  private async retrieveAliases(settingsToRetrieve: SettingsToRetrieve) {
    const aliases = await this.retrieveSettings<IndicesGetAliasResponse>(
      ENTITIES.INDICES,
      settingsToRetrieve
    );

    if (aliases) {
      const collaborator = this.mapping;
      this.alias.loadAliases(aliases, collaborator);
    }
  }

  private async retrieveDataStreams(settingsToRetrieve: SettingsToRetrieve) {
    const dataStreams = await this.retrieveSettings<IndicesGetDataStreamResponse>(
      ENTITIES.DATA_STREAMS,
      settingsToRetrieve
    );

    if (dataStreams && 'data_streams' in dataStreams) {
      this.dataStream.loadDataStreams(dataStreams);
    }
  }

  private async retrieveTemplates(settingsToRetrieve: SettingsToRetrieve) {
    return Promise.allSettled([
      this.retrieveSettings<IndicesGetTemplateResponse>(
        ENTITIES.LEGACY_TEMPLATES,
        settingsToRetrieve
      ).then((legacyTemplates) => {
        if (legacyTemplates) {
          this.legacyTemplate.loadTemplates(legacyTemplates);
        }
      }),
      this.retrieveSettings<IndicesGetIndexTemplateResponse>(
        ENTITIES.INDEX_TEMPLATES,
        settingsToRetrieve
      ).then((indexTemplates) => {
        if (indexTemplates && 'index_templates' in indexTemplates) {
          this.indexTemplate.loadTemplates(indexTemplates);
        }
      }),
      this.retrieveSettings<ClusterGetComponentTemplateResponse>(
        ENTITIES.COMPONENT_TEMPLATES,
        settingsToRetrieve
      ).then((componentTemplates) => {
        if (componentTemplates && 'component_templates' in componentTemplates) {
          this.componentTemplate.loadTemplates(componentTemplates);
        }
      }),
    ]);
  }

  public clearSubscriptions() {
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
    }
  }

  public clear() {
    this.alias.clearAliases();
    this.mapping.clearMappings();
    this.dataStream.clearDataStreams();
    this.legacyTemplate.clearTemplates();
    this.indexTemplate.clearTemplates();
    this.componentTemplate.clearTemplates();
  }
}

export const [getAutocompleteInfo, setAutocompleteInfo] =
  createGetterSetter<AutocompleteInfo>('AutocompleteInfo');
