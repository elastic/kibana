/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import React, { useMemo } from 'react';
import type { StepContext } from '@kbn/workflows';
import { convertJsonSchemaToZod } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { getProvideInputsResumeMessage } from './translations';
import { generateSampleFromJsonSchema } from '../../lib/generate_sample_from_json_schema';
import { ResumeExecutionModal } from '../resume_execution_modal/resume_execution_modal';

export interface RunWorkflowInputsModalProps {
  /** Display name of the workflow shown in the modal header. */
  workflowName: string;
  /** Normalised JSON Schema for the workflow's manual trigger inputs, used to seed the editor and validate submissions. */
  inputs: JsonModelSchemaType;
  /** Called with the parsed input values when the user confirms the form. */
  onSubmit: (values: Record<string, unknown>) => void;
  /** Called when the user dismisses the modal without submitting. */
  onCancel: () => void;
}

export const RunWorkflowInputsModal = ({
  workflowName,
  inputs,
  onSubmit,
  onCancel,
}: RunWorkflowInputsModalProps) => {
  const contextOverride = useMemo(() => {
    try {
      const jsonSchema = inputs as JSONSchema7;
      return {
        schema: convertJsonSchemaToZod(jsonSchema),
        stepContext: generateSampleFromJsonSchema(jsonSchema) as Partial<StepContext>,
        rawJsonSchema: inputs,
      };
    } catch {
      return undefined;
    }
  }, [inputs]);

  return (
    <ResumeExecutionModal
      resumeMessage={getProvideInputsResumeMessage(workflowName)}
      initialcontextOverride={contextOverride}
      onSubmit={({ stepInputs }) => onSubmit(stepInputs)}
      onClose={onCancel}
      useRunButton
    />
  );
};
