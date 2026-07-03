/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { getCachedAllConnectorsMap } from '../../../../../common/schema';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Fallback hover for connector types that no more-specific handler claimed.
 *
 * Renders whatever real metadata we have for the connector (summary / description /
 * documentation url from the loaded connector map). If we know nothing about the
 * type, we render nothing rather than invent a description.
 */
export class GenericMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  constructor() {
    // Lowest priority — catches connector types not claimed by a specific handler.
    super('GenericMonacoConnectorHandler', 1, ['']);
  }

  canHandle(): boolean {
    return true;
  }

  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    const { connectorType, stepContext } = context;
    if (!stepContext) {
      return null;
    }

    const connector = getCachedAllConnectorsMap()?.get(connectorType);
    if (!connector) {
      return null;
    }

    const bodyLines = [`**Connector**: \`${connectorType}\``];
    const summary = connector.summary ?? connector.description;
    if (summary) {
      bodyLines.push('', summary);
    }
    if (connector.documentation) {
      bodyLines.push('', `**Documentation**: ${connector.documentation}`);
    }

    return this.createMarkdownContent(
      this.prependStabilityBadgeToContent(
        this.getConnectorStabilityFromCache(connectorType),
        bodyLines
      )
    );
  }

  getExamples(connectorType: string): ConnectorExamples | null {
    return getCachedAllConnectorsMap()?.get(connectorType)?.examples ?? null;
  }
}
