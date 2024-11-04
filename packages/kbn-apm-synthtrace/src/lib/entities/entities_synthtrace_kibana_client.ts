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
import { kibanaHeaders } from '../shared/client_headers';
import { getFetchAgent } from '../../cli/utils/ssl';

interface EntityDefinitionResponse {
  definitions: Array<{ type: string; state: { installed: boolean; running: boolean } }>;
}

export class EntitiesSynthtraceKibanaClient {
  private readonly logger: Logger;
  private target: string;

  constructor(options: { logger: Logger; target: string }) {
    this.logger = options.logger;
    this.target = options.target;
  }

  async installEntityIndexPatterns() {
    const url = `${this.target}/internal/entities/definition?includeState=true`;
    const response = await fetch(url, {
      method: 'GET',
      headers: kibanaHeaders(),
      agent: getFetchAgent(url),
    });
    const entityDefinition: EntityDefinitionResponse = await response.json();

    const hasEntityDefinitionsInstalled = entityDefinition.definitions.find(
      (definition) => definition.type === 'service'
    )?.state.installed;

    if (hasEntityDefinitionsInstalled === true) {
      this.logger.debug('Entity definitions are already defined');
    } else {
      this.logger.debug('Installing Entity definitions');
      const entityEnablementUrl = `${this.target}/internal/entities/managed/enablement?installOnly=true`;
      await fetch(entityEnablementUrl, {
        method: 'PUT',
        headers: kibanaHeaders(),
        agent: getFetchAgent(url),
      });
    }
  }

  async uninstallEntityIndexPatterns() {
    const url = `${this.target}/internal/entities/managed/enablement`;
    await fetch(url, {
      method: 'DELETE',
      headers: kibanaHeaders(),
      agent: getFetchAgent(url),
    });
  }
}
