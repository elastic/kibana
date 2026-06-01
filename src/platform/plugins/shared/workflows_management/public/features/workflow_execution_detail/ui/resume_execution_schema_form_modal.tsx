/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import {
  extractSchemaDefaults,
  type InboxJsonSchema,
  SchemaForm,
  validateSchemaValues,
} from '@kbn/workflows-hitl-form';

export interface ResumeExecutionSchemaFormModalProps {
  expectedResumeSeq?: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (params: { expectedResumeSeq?: number; stepInputs: Record<string, unknown> }) => void;
  resumeMessage?: string;
  schema: JsonModelSchemaType;
}

export const ResumeExecutionSchemaFormModal: React.FC<ResumeExecutionSchemaFormModalProps> = ({
  expectedResumeSeq,
  isSubmitting = false,
  onClose,
  onSubmit,
  resumeMessage,
  schema,
}) => {
  const styles = useMemoCss(componentStyles);
  const modalTitleId = useGeneratedHtmlId();

  const inboxSchema = schema as InboxJsonSchema;
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    extractSchemaDefaults(inboxSchema)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const validationErrors = validateSchemaValues(inboxSchema, values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(
      expectedResumeSeq !== undefined
        ? { expectedResumeSeq, stepInputs: values }
        : { stepInputs: values }
    );
  };

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      data-test-subj="workflowResumeExecutionSchemaFormModal"
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <FormattedMessage
                id="workflowsManagement.resumeExecutionModal.title"
                defaultMessage="Provide action"
              />
            </EuiFlexItem>
            <EuiFlexItem css={styles.description}>
              {resumeMessage ? (
                <EuiMarkdownFormat textSize="s">{resumeMessage}</EuiMarkdownFormat>
              ) : (
                <FormattedMessage
                  id="workflowsManagement.resumeExecutionModal.description"
                  defaultMessage="Provide input to resume the workflow."
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <SchemaForm errors={errors} onChange={setValues} schema={inboxSchema} values={values} />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton
          data-test-subj="workflowSubmitResume"
          disabled={isSubmitting}
          fill
          iconType="check"
          isLoading={isSubmitting}
          onClick={handleSubmit}
          size="s"
        >
          <FormattedMessage
            id="workflowsManagement.resumeExecutionSchemaFormModal.submitBtn"
            defaultMessage="Submit"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const componentStyles = {
  description: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 's'),
      fontWeight: 'normal',
    }),
};
