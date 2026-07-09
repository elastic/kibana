/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazy, useMemo } from 'react';
import type { ActionType } from '@kbn/actions-types';
import type { DocLinksStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { IconType } from '@elastic/eui';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import type { ConnectorZodSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import { getMeta, setMeta } from '@kbn/connector-specs/src/connector_spec_ui';
import { narrowSecretsSchemaForAuthMode } from '@kbn/connector-specs/src/lib/narrow_secrets_schema_for_auth_mode';
import type {
  ConnectorSpecResponse,
  ConnectorSpecWireResponse,
} from '../apis/fetch_connector_spec';
import { transformConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type { ActionConnectorFieldsProps, ActionTypeModel } from '../types/action_types';

export type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';

const WORKFLOWS_CONNECTOR_FEATURE_ID = 'workflows';

export function shouldHideWorkflowsOnlyConnector(
  supportedFeatureIds: string[],
  uiSettings?: IUiSettingsClient
): boolean {
  if (
    supportedFeatureIds.length !== 1 ||
    supportedFeatureIds[0] !== WORKFLOWS_CONNECTOR_FEATURE_ID
  ) {
    return false;
  }
  return !(uiSettings?.get<boolean>('workflows:ui:enabled', true) ?? true);
}

/**
 * Fetches a connector spec from the API.
 */
export async function fetchConnectorSpec(
  http: HttpSetup,
  connectorTypeId: string,
  signal?: AbortSignal
): Promise<ConnectorSpecResponse> {
  const wire = await http.get<ConnectorSpecWireResponse>(
    `/internal/actions/connector_types/${encodeURIComponent(connectorTypeId)}/spec`,
    { signal }
  );
  return transformConnectorSpecResponse(wire);
}

/**
 * Resolves the documentation URL for a spec-based connector.
 *
 * The connectors base always comes from the doc-links service, so links stay correct
 * if the docs structure changes:
 * - `docsUrl === ''` → the connector has no dedicated page; link to the top-level connectors page.
 * - `docsUrl` set → used as-is (e.g. a specific page or a third-party site).
 * - `docsUrl` absent → derive from the connector id (strip leading '.', convert
 *   underscores/camelCase to kebab-case, append '-action-type').
 */
function getDocsUrlFromSpec(spec: ConnectorSpecResponse, docLinks: DocLinksStart): string {
  const { docsUrl, id } = spec.metadata;
  const connectorsDocs = docLinks.links.alerting.connectors;

  if (docsUrl === '') {
    return connectorsDocs;
  }
  if (docsUrl) {
    return docsUrl;
  }
  const slug = id
    .replace(/^\./, '')
    .replace(/_/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return `${connectorsDocs}/${slug}-action-type`;
}

/**
 * Resolves the icon for a connector based on the spec metadata.
 */
function getIconFromSpec(spec: ConnectorSpecResponse): IconType {
  if (spec.metadata.icon) {
    return spec.metadata.icon;
  }

  const lazyIcon = ConnectorIconsMap.get(spec.metadata.id);
  if (lazyIcon) {
    return lazyIcon;
  }

  return 'plugs';
}

/**
 * Transforms a ConnectorSpecResponse into an ActionTypeModel.
 *
 * This creates a model that can be used by the connector form components,
 * with dynamically generated form fields from the JSON schema.
 */
export function transformSpecToActionTypeModel(
  spec: ConnectorSpecResponse,
  docLinks: DocLinksStart,
  uiSettings?: IUiSettingsClient
): ActionTypeModel {
  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    selectMessage: spec.metadata.description,
    iconClass: getIconFromSpec(spec),
    subtype: undefined,
    isExperimental: spec.metadata.isTechnicalPreview ?? false,
    docsUrl: getDocsUrlFromSpec(spec, docLinks),
    getHideInUi: (_actionTypes: ActionType[]) =>
      shouldHideWorkflowsOnlyConnector(spec.metadata.supportedFeatureIds, uiSettings),
    actionConnectorFields: lazy(async () => {
      const { generateFormFields } = await import(
        /* webpackPrefetch: true */ '@kbn/response-ops-form-generator'
      );
      const parsedZodSchema = fromConnectorSpecSchema(spec.schema);
      if (!parsedZodSchema) {
        throw new Error(`Invalid connector spec schema for "${spec.metadata.id}"`);
      }
      const connectorZodSchema: ConnectorZodSchema = parsedZodSchema;
      function SpecConnectorFormFields({ readOnly, isEdit, authMode }: ActionConnectorFieldsProps) {
        const narrowedSchema = useMemo(
          () => narrowSecretsSchemaForAuthMode(connectorZodSchema, authMode),
          // connectorZodSchema is stable for the lifetime of this lazy-loaded module; it is intentionally omitted from deps.

          [authMode]
        );
        return generateFormFields({
          schema: narrowedSchema,
          formConfig: { disabled: readOnly, isEdit },
          metaFunctions: { getMeta, setMeta },
        });
      }
      return { default: SpecConnectorFormFields };
    }),
    actionParamsFields: lazy(async () => ({ default: () => null })),
    validateParams: async () => ({ errors: {} }),
    connectorForm: {
      serializer: createConnectorFormSerializer() as unknown as NonNullable<
        ActionTypeModel['connectorForm']
      >['serializer'],
      deserializer: createConnectorFormDeserializer() as unknown as NonNullable<
        ActionTypeModel['connectorForm']
      >['deserializer'],
    },
  };
}

/**
 * Copy secrets.authType to config.authType when saving the connector.
 * This ensures authType persists since secrets are stripped by the API.
 */
function createConnectorFormSerializer() {
  return (formData: Record<string, unknown>) => {
    const secrets = formData?.secrets as Record<string, unknown> | undefined;
    if (!secrets?.authType) {
      return formData;
    }

    const config = formData?.config as Record<string, unknown> | undefined;
    return {
      ...formData,
      config: { ...config, authType: secrets.authType },
    };
  };
}

/**
 * Copies config.authType to secrets.authType when loading the connector.
 * This allows the discriminated union widget to display the correct option on
 * connector edit.
 */
function createConnectorFormDeserializer() {
  return (apiData: Record<string, unknown>) => {
    const config = apiData?.config as Record<string, unknown> | undefined;
    const secrets = apiData?.secrets as Record<string, unknown> | undefined;

    if (!config?.authType || secrets?.authType) {
      return apiData;
    }

    return { ...apiData, secrets: { ...(secrets ?? {}), authType: config.authType } };
  };
}
