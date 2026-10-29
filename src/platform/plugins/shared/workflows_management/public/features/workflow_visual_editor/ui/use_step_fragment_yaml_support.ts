/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux-v7';
import type { monaco } from '@kbn/monaco';
import { getWorkflowZodSchema } from '../../../../common/schema';
import { useAvailableConnectors } from '../../../entities/connectors/model/use_available_connectors';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import { triggerSchemas } from '../../../trigger_schemas';
import { useWorkflowYamlValidationContext } from '../../validate_workflow_yaml/lib/use_workflow_yaml_validation_context';
import {
  attachStepFragmentYamlSupport,
  type StepFragmentYamlSupportHandle,
  type StepFragmentYamlSupportInputs,
} from '../lib/attach_step_fragment_yaml_support';

/**
 * Wires the step-config panel's YAML tab so it validates and autocompletes as
 * if the fragment it shows were still inline in the full workflow YAML (see
 * `attachStepFragmentYamlSupport`). Returns a stable `editorDidMount` to pass
 * to the YAML tab's `CodeEditor`.
 */
export const useStepFragmentYamlSupport = (
  stepName: string | undefined
): ((editor: monaco.editor.IStandaloneCodeEditor) => void) => {
  const workflowYaml = useSelector(selectYamlString);
  const connectorsData = useAvailableConnectors();
  const validationContext = useWorkflowYamlValidationContext();
  // Same derivation as the change-history preview's validation pipeline
  // (`useWorkflowChangeHistoryPreviewValidation`), which also feeds
  // `collectYamlSchemaValidationResults`.
  const workflowZodSchema = useMemo(
    () =>
      getWorkflowZodSchema(
        connectorsData?.connectorTypes ?? {},
        triggerSchemas.getRegisteredTriggersForSchema()
      ),
    [connectorsData?.connectorTypes]
  );

  const inputsRef = useRef<StepFragmentYamlSupportInputs>({
    workflowYaml,
    stepName,
    workflowZodSchema,
    validationContext,
  });
  inputsRef.current = { workflowYaml, stepName, workflowZodSchema, validationContext };

  const handleRef = useRef<StepFragmentYamlSupportHandle | null>(null);

  useEffect(() => {
    handleRef.current?.revalidate();
  }, [workflowYaml, stepName, workflowZodSchema, validationContext]);

  useEffect(
    () => () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    },
    []
  );

  return useMemo(
    () => (editor: monaco.editor.IStandaloneCodeEditor) => {
      handleRef.current?.dispose();
      handleRef.current = attachStepFragmentYamlSupport(editor, () => inputsRef.current);
    },
    []
  );
};
