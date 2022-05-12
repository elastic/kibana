/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type {
  ClusterGetComponentTemplateResponse,
  IndicesGetAliasResponse,
  IndicesGetDataStreamResponse,
  IndicesGetIndexTemplateResponse,
  IndicesGetMappingResponse,
  IndicesGetTemplateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { API_BASE_PATH } from '../../common/constants';
import {
  Alias,
  DataStream,
  Mapping,
  LegacyTemplate,
  IndexTemplate,
  ComponentTemplate,
} from '../lib/mappings';
import { DevToolsSettings, Settings } from './settings';

interface MappingsApiResponse {
  mappings: IndicesGetMappingResponse;
  aliases: IndicesGetAliasResponse;
  dataStreams: IndicesGetDataStreamResponse;
  templates: {
    legacyTemplates: IndicesGetTemplateResponse;
    indexTemplates: IndicesGetIndexTemplateResponse;
    componentTemplates: ClusterGetComponentTemplateResponse;
  };
}

export class AutocompleteInfo {
  public readonly alias: Alias;
  public readonly mapping: Mapping;
  public readonly dataStream: DataStream;
  public readonly legacyTemplate: LegacyTemplate;
  public readonly indexTemplate: IndexTemplate;
  public readonly componentTemplate: ComponentTemplate;
  private http!: HttpSetup;
  private pollTimeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.alias = new Alias();
    this.mapping = new Mapping();
    this.dataStream = new DataStream();
    this.legacyTemplate = new LegacyTemplate();
    this.indexTemplate = new IndexTemplate();
    this.componentTemplate = new ComponentTemplate();
  }

  public setup(http: HttpSetup) {
    this.http = http;
  }

  public retrieve(settings: Settings, settingsToRetrieve: DevToolsSettings['autocomplete']) {
    this.clearSubscriptions();
    this.http
      .get<MappingsApiResponse>(`${API_BASE_PATH}/mappings`, { query: { ...settingsToRetrieve } })
      .then((data) => {
        this.alias.load(data.aliases);
        this.mapping.load(data.mappings);
        this.dataStream.load(data.dataStreams);
        this.legacyTemplate.load(data.templates.legacyTemplates);
        this.indexTemplate.load(data.templates.indexTemplates);
        this.componentTemplate.load(data.templates.componentTemplates);
        // Schedule next request.
        this.pollTimeoutId = setTimeout(() => {
          // This looks strange/inefficient, but it ensures correct behavior because we don't want to send
          // a scheduled request if the user turns off polling.
          if (settings.getPolling()) {
            this.retrieve(settings, settings.getAutocomplete());
          }
        }, settings.getPollInterval());
      });
  }

  public clearSubscriptions() {
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
    }
  }

  public clear() {
    this.alias.clear();
    this.mapping.clear();
    this.dataStream.clear();
    this.legacyTemplate.clear();
    this.indexTemplate.clear();
    this.componentTemplate.clear();
  }
}

export const [getAutocompleteInfo, setAutocompleteInfo] =
  createGetterSetter<AutocompleteInfo>('AutocompleteInfo');
