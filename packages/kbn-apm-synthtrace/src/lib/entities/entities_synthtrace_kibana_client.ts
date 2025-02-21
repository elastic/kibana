/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import { Logger } from '../utils/create_logger';
import { SynthtraceEsClientOptions } from '../shared/base_client';
import { KibanaClient } from '../shared/base_kibana_client';

interface EntityDefinitionResponse {
  definitions: Array<{ type: string; state: { installed: boolean; running: boolean } }>;
}

export class EntitiesSynthtraceKibanaClient {
  private readonly logger: Logger;
  private readonly kibana: KibanaClient;

  constructor(options: Pick<SynthtraceEsClientOptions, 'logger' | 'kibana'>) {
    this.kibana = options.kibana;
    this.logger = options.logger;
  }

  async installEntityIndexPatterns() {
    const entityDefinition = await this.kibana.fetch<EntityDefinitionResponse>(
      `/internal/entities/definition?includeState=true`,
      {
        method: 'GET',
      }
    );

    const hasEntityDefinitionsInstalled = entityDefinition.definitions?.find(
      (definition) => definition.type === 'service'
    )?.state.installed;

    if (hasEntityDefinitionsInstalled === true) {
      this.logger.debug('Entity definitions are already defined');
    } else {
      this.logger.debug('Installing Entity definitions');
      await fetch(`/internal/entities/managed/enablement?installOnly=true`, {
        method: 'PUT',
      });
    }
  }

  async uninstallEntityIndexPatterns() {
    await fetch(`/internal/entities/managed/enablement`, {
      method: 'DELETE',
    });
  }
}
