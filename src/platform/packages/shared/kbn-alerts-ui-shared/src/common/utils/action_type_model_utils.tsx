/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionType } from '@kbn/actions-types';
import type { DocLinksStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { IconType } from '@elastic/eui';
import {
  getConnectorSpec,
  hasRunActionsSwitch,
  isInboundOnlyConnectorSpec,
} from '@kbn/connector-specs';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { fromConnectorSpecSchema, narrowSecretsSchemaForAuthMode } from '@kbn/connector-specs';
import type { ConnectorZodSchema } from '@kbn/connector-specs';
import { getMeta, setMeta } from '@kbn/connector-specs';
import { UseField, type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConnectorActionSelector } from '../components/connector_action_selector';
import type {
  ConnectorActionDef,
  ConnectorSpecResponse,
  ConnectorSpecWireResponse,
} from '../apis/fetch_connector_spec';
import { transformConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type {
  ActionConnectorFieldsProps,
  ActionTypeModel,
  ConnectorFormSchema,
  InternalConnectorForm,
} from '../types/action_types';
import { isRunActionsOff } from './run_actions_field';

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

const NO_AUTH_TYPE_ID = 'none';

/**
 * Whether the action selection is an empty custom list the form should reject. With Run actions
 * off, the serializer saves no actions on purpose.
 */
export const isMissingSelectedActions = (
  selectedActions: unknown,
  runActionsOff: boolean
): boolean => !runActionsOff && Array.isArray(selectedActions) && selectedActions.length === 0;

/** Hides one auth type option from the form's auth picker. */
export const hideAuthTypeInPicker = (schema: ConnectorZodSchema, authTypeId: string): void => {
  const { secrets } = schema.shape;
  if (!('options' in secrets)) {
    return;
  }
  for (const option of secrets.options) {
    const authTypeField = (option as { shape?: Record<string, { value?: unknown }> }).shape
      ?.authType;
    if (authTypeField?.value === authTypeId) {
      setMeta(option, { ...getMeta(option), hideInPicker: true });
    }
  }
};

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
  const registeredSpec = getConnectorSpec(spec.metadata.id);
  const showsRunActionsSwitch = hasRunActionsSwitch(registeredSpec);

  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    selectMessage: spec.metadata.description,
    iconClass: getIconFromSpec(spec),
    subtype: undefined,
    isTestable: spec.isTestable,
    isExperimental: spec.metadata.isTechnicalPreview ?? false,
    docsUrl: getDocsUrlFromSpec(spec, docLinks),
    getHideInUi: (_actionTypes: ActionType[]) =>
      shouldHideWorkflowsOnlyConnector(spec.metadata.supportedFeatureIds, uiSettings),
    actionConnectorFields: lazy(async () => {
      const [{ generateFormFields }, { EuiSpacer }] = await Promise.all([
        import(/* webpackPrefetch: true */ '@kbn/response-ops-form-generator'),
        import('@elastic/eui'),
      ]);
      const parsedZodSchema = fromConnectorSpecSchema(spec.schema);
      if (!parsedZodSchema) {
        throw new Error(`Invalid connector spec schema for "${spec.metadata.id}"`);
      }
      const connectorZodSchema: ConnectorZodSchema = parsedZodSchema;
      const specActions = spec.actions ?? [];
      // Connectors with a Run actions switch hide auth type none in outbound options.
      if (showsRunActionsSwitch) {
        hideAuthTypeInPicker(connectorZodSchema, NO_AUTH_TYPE_ID);
      }

      // Bridges UseField's FieldHook API to ConnectorActionSelector's value/onChange props.
      const ConnectorActionSelectorField = ({
        field,
        actions,
        readOnly,
      }: {
        field: FieldHook<string[] | null>;
        actions: ConnectorActionDef[];
        readOnly?: boolean;
      }) => (
        <ConnectorActionSelector
          value={field.value ?? null}
          onChange={field.setValue}
          actions={actions}
          readOnly={readOnly}
          errorMessage={field.errors[0]?.message}
        />
      );

      function SpecConnectorFormFields({ readOnly, isEdit, authMode }: ActionConnectorFieldsProps) {
        const narrowedSchema = useMemo(
          () => narrowSecretsSchemaForAuthMode(connectorZodSchema, authMode),
          // connectorZodSchema is stable for the lifetime of this lazy-loaded module; it is intentionally omitted from deps.

          [authMode]
        );
        const configFields = generateFormFields({
          schema: narrowedSchema,
          formConfig: {
            disabled: readOnly,
            isEdit,
            shouldSkipValidation: (path, form) =>
              path.startsWith('secrets.') && isRunActionsOff(form),
          },
          metaFunctions: { getMeta, setMeta },
        });

        if (specActions.length <= 1) {
          return configFields;
        }
        return (
          <>
            {configFields}
            <EuiSpacer size="m" />
            <UseField
              path="config.selectedActions"
              config={{
                defaultValue: null,
                validations: [
                  {
                    validator: ({ value, form }) =>
                      isMissingSelectedActions(value, isRunActionsOff(form))
                        ? {
                            message: i18n.translate(
                              'alertsUIShared.connectorActionSelector.emptySelectionError',
                              { defaultMessage: 'Select at least one action, or enable All.' }
                            ),
                          }
                        : undefined,
                  },
                ],
              }}
              component={ConnectorActionSelectorField}
              componentProps={{ actions: specActions, readOnly }}
            />
          </>
        );
      }
      return { default: SpecConnectorFormFields };
    }),
    actionParamsFields: lazy(async () => ({ default: () => null })),
    validateParams: async () => ({ errors: {} }),
    connectorForm: {
      serializer: serializeConnectorForm,
      deserializer: createConnectorFormDeserializer(showsRunActionsSwitch),
      hideSettingsTitle: registeredSpec !== undefined && isInboundOnlyConnectorSpec(registeredSpec),
    },
  };
}

const omitAuthType = (fields: Record<string, unknown> = {}): Record<string, unknown> =>
  Object.fromEntries(Object.entries(fields).filter(([key]) => key !== 'authType'));

function serializeConnectorForm(formData: InternalConnectorForm): InternalConnectorForm {
  const { __internal__: internalFields, ...connector } = formData;
  const { runActions, ...otherInternalFields } = internalFields ?? {};
  const { config, secrets } = connector;
  const serialized: InternalConnectorForm =
    Object.keys(otherInternalFields).length > 0
      ? { ...connector, __internal__: otherInternalFields }
      : connector;

  // Run actions off: the connector only receives events, so it saves no auth and no actions.
  if (runActions === false) {
    return {
      ...serialized,
      secrets: { authType: NO_AUTH_TYPE_ID },
      config: { ...config, authType: NO_AUTH_TYPE_ID, selectedActions: [] },
    };
  }

  const updatedConfig: Record<string, unknown> = {
    ...config,
    ...(secrets?.authType ? { authType: secrets.authType } : {}),
  };

  if (updatedConfig.selectedActions == null) {
    delete updatedConfig.selectedActions;
  }

  return { ...serialized, config: updatedConfig };
}

function createConnectorFormDeserializer(showsRunActionsSwitch: boolean) {
  return (apiData: ConnectorFormSchema): InternalConnectorForm => {
    const { config, secrets } = apiData;

    // A saved receive-only connector loads with Run actions off. The auth picker falls back to its
    // default and the action selection to All, ready for when Run actions is turned on.
    if (showsRunActionsSwitch && (config?.authType ?? secrets?.authType) === NO_AUTH_TYPE_ID) {
      return {
        ...apiData,
        config: { ...omitAuthType(config), selectedActions: null },
        secrets: omitAuthType(secrets),
        __internal__: { runActions: false },
      };
    }

    if (!config?.authType || secrets?.authType) {
      return apiData;
    }

    return { ...apiData, secrets: { ...secrets, authType: config.authType } };
  };
}
