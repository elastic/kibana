/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { parseDocument } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { updateWorkflowYamlFields } from '../../../../common/lib/yaml/update_workflow_yaml_fields';
import { getAllConnectorsWithDynamic } from '../../../../common/schema';
import {
  selectConnectors,
  selectEditorWorkflowDefinition,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setYamlString } from '../../../entities/workflows/store/workflow_detail/slice';
import {
  type ConstantField,
  constantsToYamlRecord,
  type OutputField,
  outputsToJsonSchema,
  parseConstsToFields,
  parseOutputsToFields,
  writeRootYamlMapping,
} from '../../../pages/workflow_detail/ui/workflow_settings_fields_model';
import { findStepsReferencingPath } from '../../../shared/ui/schema_property_builder';

/**
 * Shared draft hydration + YAML write-through for Option A/B/C settings surfaces.
 */
export function useWorkflowSettingsDraft(options?: {
  readonly hydrateKey?: string | number | boolean;
  readonly readOnly?: boolean;
}) {
  const hydrateKey = options?.hydrateKey;
  const readOnly = options?.readOnly ?? false;
  const dispatch = useDispatch();
  const yamlString = useSelector(selectYamlString) ?? '';
  const definition = useSelector(selectEditorWorkflowDefinition) as WorkflowYaml | undefined;
  const loadedConnectors = useSelector(selectConnectors);
  const connectors = useMemo(
    () => getAllConnectorsWithDynamic(loadedConnectors?.connectorTypes),
    [loadedConnectors?.connectorTypes]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [constantFields, setConstantFields] = useState<ConstantField[]>([]);
  const [outputFields, setOutputFields] = useState<OutputField[]>([]);

  useEffect(() => {
    try {
      const doc = parseDocument(yamlString);
      const js = doc.toJS() as Record<string, unknown> | null;
      setConstantFields(parseConstsToFields(js?.consts ?? definition?.consts));
      setOutputFields(parseOutputsToFields(js?.outputs ?? definition?.outputs));
    } catch {
      setConstantFields(parseConstsToFields(definition?.consts));
      setOutputFields(parseOutputsToFields(definition?.outputs));
    }
    setName(typeof definition?.name === 'string' ? definition.name : '');
    setDescription(typeof definition?.description === 'string' ? definition.description : '');
    setTags(Array.isArray(definition?.tags) ? [...definition.tags] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on open / variant change
  }, [hydrateKey]);

  const applyYamlPatch = useCallback(
    (patch: { name?: string; description?: string; tags?: string[] }) => {
      if (readOnly) return;
      const nextYaml = updateWorkflowYamlFields(yamlString, patch);
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const handleConstantsChange = useCallback(
    (next: readonly ConstantField[]) => {
      setConstantFields([...next]);
      if (readOnly) return;
      const nextYaml = writeRootYamlMapping(yamlString, 'consts', constantsToYamlRecord(next));
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const handleOutputsChange = useCallback(
    (next: readonly OutputField[]) => {
      setOutputFields([...next]);
      if (readOnly) return;
      const nextYaml = writeRootYamlMapping(yamlString, 'outputs', outputsToJsonSchema(next));
      if (nextYaml !== yamlString) {
        dispatch(setYamlString(nextYaml));
      }
    },
    [dispatch, readOnly, yamlString]
  );

  const findConstRefs = useCallback(
    (constName: string) => findStepsReferencingPath(yamlString, 'consts', constName),
    [yamlString]
  );

  const findOutputRefs = useCallback(
    (outputName: string) => findStepsReferencingPath(yamlString, 'outputs', outputName),
    [yamlString]
  );

  const constsYaml = useMemo(() => {
    try {
      return JSON.stringify(constantsToYamlRecord(constantFields), null, 2);
    } catch {
      return '';
    }
  }, [constantFields]);

  const outputsYaml = useMemo(() => {
    try {
      return JSON.stringify(outputsToJsonSchema(outputFields), null, 2);
    } catch {
      return '';
    }
  }, [outputFields]);

  return {
    definition,
    connectors,
    yamlString,
    name,
    setName,
    description,
    setDescription,
    tags,
    setTags,
    constantFields,
    outputFields,
    applyYamlPatch,
    handleConstantsChange,
    handleOutputsChange,
    findConstRefs,
    findOutputRefs,
    constsYaml,
    outputsYaml,
  };
}
