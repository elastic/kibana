/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove the eslint-disable comments to use the proper types.

import { useMemo } from 'react';
import { getOrResolveObject, getWorkflowJsonSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import { getWorkflowZodSchema, getWorkflowZodSchemaLoose } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { useKibana } from '../../../hooks/use_kibana';
import { triggerSchemas } from '../../../trigger_schemas';

const WorkflowSchemaUriStrict = 'file:///workflow-schema.json';
const WorkflowSchemaUriStrictWithDynamicConnectors =
  'file:///workflow-schema-strict-with-dynamic-connectors.json';
const WorkflowSchemaUriLoose = 'file:///workflow-schema-loose.json';
const WorkflowSchemaUriLooseWithDynamicConnectors =
  'file:///workflow-schema-loose-with-dynamic-connectors.json';

interface UseWorkflowJsonSchemaOptions {
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose?: boolean;
}

interface UseWorkflowJsonSchemaResult {
  jsonSchema: z.core.JSONSchema.JSONSchema | null;
  uri: string | null;
}

export const useWorkflowJsonSchema = ({
  loose = false,
}: UseWorkflowJsonSchemaOptions = {}): UseWorkflowJsonSchemaResult => {
  const connectorsData = useAvailableConnectors();
  const serviceAccountsEnabled = useKibana().services.security.serviceAccounts.isEnabled();

  // TODO: download from server instead of generating on client

  // Generate JSON schema dynamically to include all current connectors (static + dynamic)
  // Now uses lazy loading to keep large generated files out of main bundle
  return useMemo(() => {
    try {
      let uri = loose ? WorkflowSchemaUriLoose : WorkflowSchemaUriStrict;
      if (connectorsData?.connectorTypes) {
        uri = loose
          ? WorkflowSchemaUriLooseWithDynamicConnectors
          : WorkflowSchemaUriStrictWithDynamicConnectors;
      }
      const connectorTypes = connectorsData?.connectorTypes ?? {};
      const registeredTriggers = triggerSchemas.getRegisteredTriggersForSchema();
      const zodSchema = loose
        ? getWorkflowZodSchemaLoose(connectorTypes)
        : getWorkflowZodSchema(connectorTypes, registeredTriggers); // TODO: remove this once we move the schema generation up to detail page or some wrapper component
      const jsonSchema = getWorkflowJsonSchema(zodSchema);
      if (jsonSchema && !serviceAccountsEnabled) {
        const workflowSchema = getOrResolveObject<z.core.JSONSchema.JSONSchema>(
          jsonSchema,
          jsonSchema
        );
        const settingsSchema = getOrResolveObject<z.core.JSONSchema.JSONSchema>(
          workflowSchema?.properties?.settings,
          jsonSchema
        );
        const runAsSchema = settingsSchema?.properties?.run_as;
        if (runAsSchema && typeof runAsSchema === 'object') {
          // Hide completion without invalidating a saved workflow's execution identity.
          runAsSchema.doNotSuggest = true;
        }
      }

      return {
        jsonSchema,
        uri,
      };
    } catch (error) {
      // console.error('🚨 Schema generation failed:', error);
      return {
        jsonSchema: null,
        uri: null,
      };
    }
  }, [connectorsData, loose, serviceAccountsEnabled]);
};
