/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  RULE_PAGE_FOOTER_CANCEL_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
  RULE_PAGE_FOOTER_CREATE_TEXT,
  RULE_PAGE_FOOTER_SAVE_TEXT,
  RULE_PAGE_FOOTER_PREVIEW_TEXT,
} from '../translations';
import { useRuleFormScreenContext, useRuleFormState } from '../hooks';
import { hasRuleErrors } from '../validation';
import { ConfirmCreateRule } from '../components';
import { useRuleFormInspector } from './inspector_context';

export interface RulePageFooterProps {
  isEdit?: boolean;
  isSaving?: boolean;
  isRunningPreview?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onPreview: (formData: any) => Promise<any>;
}

export const RulePageFooter = (props: RulePageFooterProps) => {
  const [showCreateConfirmation, setShowCreateConfirmation] = useState<boolean>(false);
  const {
    services: { inspector },
  } = useKibana();
  const { requestsAdapter } = useRuleFormInspector();

  const { setIsShowRequestScreenVisible } = useRuleFormScreenContext();

  const {
    isEdit = false,
    isSaving = false,
    isRunningPreview = false,
    onCancel,
    onSave,
    onPreview,
  } = props;

  const {
    plugins: { application },
    formData,
    connectors,
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
  } = useRuleFormState();

  const hasErrors = useMemo(() => {
    const hasBrokenConnectors = formData.actions.some((action) => {
      return !connectors.find((connector) => connector.id === action.id);
    });

    if (hasBrokenConnectors) {
      return true;
    }

    return hasRuleErrors({
      baseErrors,
      paramsErrors,
      actionsErrors,
      actionsParamsErrors,
    });
  }, [formData.actions, connectors, baseErrors, paramsErrors, actionsErrors, actionsParamsErrors]);

  const saveButtonText = useMemo(() => {
    if (isEdit) {
      return RULE_PAGE_FOOTER_SAVE_TEXT;
    }
    return RULE_PAGE_FOOTER_CREATE_TEXT;
  }, [isEdit]);

  const onOpenShowRequestModalClick = useCallback(() => {
    setIsShowRequestScreenVisible(true);
  }, [setIsShowRequestScreenVisible]);

  const onPreviewClick = useCallback(async () => {
    requestsAdapter.reset();

    try {
      const response = await onPreview(formData);
      if (response._inspect && response._inspect.esQueries) {
        response._inspect.esQueries.forEach((operation: any, index) => {
          const requestResponder = requestsAdapter.start(`Rule execution Query ${index}`, {
            id: uuidv4(),
          });

          try {
            requestResponder.json(JSON.parse(operation.params.body));
            if (operation.response.statusCode < 400) {
              // Mark this specific operation as successful.
              requestResponder.ok({
                json: {
                  rawResponse: operation.response.body,
                  requestParams: operation.params,
                },
              });
            } else {
              requestResponder.error({
                body: operation.response.body,
                requestParams: operation.params,
              });
            }
          } catch (error: any) {
            // TODO: how to handle error
            console.log('error:', error);
            requestResponder.error({
              json: { message: error.message },
            });
          }
        });
      }
      inspector.open({ requests: requestsAdapter });
    } catch (error: any) {
      // TODO: how to handle error
      console.log('error:', error);
      requestResponder.error({
        json: { message: error.message },
      });
      inspector.open({ requests: requestsAdapter });
    }
  }, [formData, onPreview, inspector, requestsAdapter]);

  const onSaveClick = useCallback(() => {
    if (isEdit) {
      return onSave();
    }
    const canReadConnectors = !!application.capabilities.actions?.show;
    if (formData.actions.length === 0 && canReadConnectors) {
      return setShowCreateConfirmation(true);
    }
    onSave();
  }, [formData.actions, isEdit, application, onSave]);

  const onCreateConfirmClick = useCallback(() => {
    setShowCreateConfirmation(false);
    onSave();
  }, [onSave]);

  const onCreateCancelClick = useCallback(() => {
    setShowCreateConfirmation(false);
  }, []);

  return (
    <>
      <EuiFlexGroup data-test-subj="rulePageFooter" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="rulePageFooterCancelButton"
            onClick={onCancel}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {RULE_PAGE_FOOTER_CANCEL_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="rulePageFooterShowRequestButton"
                onClick={onOpenShowRequestModalClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="rulePageFooterPreviewButton"
                onClick={onPreviewClick}
                disabled={isSaving || hasErrors || isRunningPreview}
                isLoading={isRunningPreview}
              >
                {RULE_PAGE_FOOTER_PREVIEW_TEXT}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="rulePageFooterSaveButton"
                onClick={onSaveClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {saveButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showCreateConfirmation && (
        <ConfirmCreateRule onConfirm={onCreateConfirmClick} onCancel={onCreateCancelClick} />
      )}
    </>
  );
};
