/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '@kbn/connector-specs';
import {
  connectorsSpecs,
  DEFAULT_GENERIC_REQUEST_DESCRIPTION,
  GENERIC_REQUEST_SUB_ACTION,
} from '@kbn/connector-specs';
import type { monaco } from '@kbn/monaco';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Builds a lookup of v2 connector-spec connectors keyed by their workflow
 * connector-type name (the spec `metadata.id` without the leading dot, e.g.
 * `.slack` -> `slack`).
 */
const buildSpecsByTypeName = (): Map<string, ConnectorSpec> => {
  const map = new Map<string, ConnectorSpec>();
  for (const spec of Object.values(connectorsSpecs) as ConnectorSpec[]) {
    const id = spec?.metadata?.id;
    if (typeof id === 'string' && id.length > 0) {
      map.set(id.replace(/^\./, ''), spec);
    }
  }
  return map;
};

/**
 * Monaco hover handler for v2 connector-spec connectors. Surfaces the real
 * per-action description from the connector spec (including the synthesized
 * generic `request` action) instead of the keyword-based generic fallback.
 */
export class SpecConnectorMonacoHandler extends BaseMonacoConnectorHandler {
  private readonly specsByTypeName: Map<string, ConnectorSpec>;

  constructor() {
    // Above the generic fallback (priority 1), below the dedicated
    // elasticsearch/kibana handlers.
    super('SpecConnectorMonacoHandler', 50, []);
    this.specsByTypeName = buildSpecsByTypeName();
  }

  /**
   * Split a workflow connector type (`{typeName}.{action}`) into its spec and
   * action parts, if it maps to a known connector spec.
   */
  private resolve(
    connectorType: string
  ): { spec: ConnectorSpec; typeName: string; actionName: string } | null {
    const separatorIndex = connectorType.indexOf('.');
    if (separatorIndex <= 0) {
      return null;
    }
    const typeName = connectorType.slice(0, separatorIndex);
    const actionName = connectorType.slice(separatorIndex + 1);
    const spec = this.specsByTypeName.get(typeName);
    if (!spec || !actionName) {
      return null;
    }
    return { spec, typeName, actionName };
  }

  canHandle(connectorType: string): boolean {
    return this.resolve(connectorType) !== null;
  }

  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    try {
      const { connectorType, stepContext } = context;
      if (!stepContext) {
        return null;
      }

      const resolved = this.resolve(connectorType);
      if (!resolved) {
        return null;
      }
      const { spec, actionName } = resolved;

      const description = this.getActionDescription(spec, actionName);
      if (!description) {
        return null;
      }

      const bodyLines = [
        `**Connector**: \`${spec.metadata.displayName}\``,
        '',
        `**Action**: \`${actionName}\``,
        '',
        description,
      ];

      // For the generic request action, surface the base URL that a relative
      // `path` resolves against so authors know what to prefix.
      if (actionName === GENERIC_REQUEST_SUB_ACTION && !spec.disableGenericRequest) {
        bodyLines.push('', this.getBaseUrlHint(spec));
      }

      bodyLines.push(
        '',
        '_💡 Tip: Use Ctrl+Space for parameter autocomplete in the `with` block._'
      );

      return this.createMarkdownContent(
        this.prependStabilityBadgeToContent(
          this.getConnectorStabilityFromCache(connectorType),
          bodyLines
        )
      );
    } catch (error) {
      return null;
    }
  }

  getExamples(): ConnectorExamples | null {
    return null;
  }

  /**
   * Resolves the human-readable description for an action, falling back to the
   * generic request description for the framework-synthesized `request` action.
   */
  private getActionDescription(spec: ConnectorSpec, actionName: string): string | null {
    const definedDescription = spec.actions?.[actionName]?.description;
    if (definedDescription) {
      return definedDescription;
    }
    if (actionName === GENERIC_REQUEST_SUB_ACTION && !spec.disableGenericRequest) {
      return spec.genericRequestDescription ?? DEFAULT_GENERIC_REQUEST_DESCRIPTION;
    }
    return null;
  }

  /**
   * Builds the base-URL hint line for the request action. Constant-host specs
   * resolve to a literal (their `getBaseUrl` ignores the context); config- or
   * secret-derived specs cannot be resolved at authoring time, so we show a note
   * instead. Specs without `getBaseUrl` (multi-host) only accept an absolute
   * `url`.
   */
  private getBaseUrlHint(spec: ConnectorSpec): string {
    if (!spec.getBaseUrl) {
      return '**Base URL**: _not available — provide an absolute `url` (this connector targets multiple hosts)._';
    }
    const staticBaseUrl = this.tryResolveStaticBaseUrl(spec);
    if (staticBaseUrl) {
      return `**Base URL** (\`path\` is appended to this): \`${staticBaseUrl}\``;
    }
    return '**Base URL**: resolved from the connector configuration at run time; `path` is appended to it.';
  }

  /**
   * Attempts to resolve a connector's base URL without a runtime context.
   * Only resolves for specs whose `getBaseUrl` is context-independent (constant
   * hosts); returns null when resolution would depend on config/secrets, so we
   * never surface a misleading, partially-interpolated URL.
   */
  private tryResolveStaticBaseUrl(spec: ConnectorSpec): string | null {
    const { getBaseUrl } = spec;
    if (!getBaseUrl || getBaseUrl.length > 0 || this.usesContext(getBaseUrl)) {
      // `getBaseUrl.length > 0` means it declares a parameter (i.e. uses ctx).
      return null;
    }
    try {
      const resolved = getBaseUrl({} as ActionContext);
      return typeof resolved === 'string' && resolved.length > 0 ? resolved : null;
    } catch {
      return null;
    }
  }

  /**
   * Heuristic: whether a `getBaseUrl` implementation references the action
   * context (config/secrets), in which case it can't be resolved at authoring
   * time.
   */
  private usesContext(getBaseUrl: NonNullable<ConnectorSpec['getBaseUrl']>): boolean {
    const source = Function.prototype.toString.call(getBaseUrl);
    return /\b(ctx|config|secrets)\b/.test(source);
  }
}
