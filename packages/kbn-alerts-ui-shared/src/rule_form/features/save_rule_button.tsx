/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { useCreateRuleApi, useUpdateRuleApi } from '../apis';
import { useValidation } from '../contexts';
import { flattenErrorObject } from '../common/validation_error';

const createRuleButtonLabel = i18n.translate('alertsUIShared.ruleForm.createRuleButtonLabel', {
  defaultMessage: 'Create rule',
});

const saveRuleButtonLabel = i18n.translate('alertsUIShared.ruleForm.saveRuleButtonLabel', {
  defaultMessage: 'Save rule',
});

interface SaveRuleButtonProps {
  isEdit?: boolean;
  onSuccessfulSave: (ruleId: string) => void;
}

export const SaveRuleButton: React.FC<SaveRuleButtonProps> = ({
  isEdit = false,
  onSuccessfulSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const createRule = useCreateRuleApi();
  const updateRule = useUpdateRuleApi();
  const validation = useValidation();

  const { isOverallValid } = validation;
  const errorList = useMemo(() => flattenErrorObject(validation).join(' '), [validation]);

  const onClickSave = useCallback(async () => {
    setIsSaving(true);
    if (isEdit) {
      const updatedRule = await updateRule();
      if (updatedRule) onSuccessfulSave(updatedRule.id);
    } else {
      const newRule = await createRule();
      if (newRule) onSuccessfulSave(newRule.id);
    }
    setIsSaving(false);
  }, [createRule, updateRule, onSuccessfulSave, isEdit]);

  return (
    <EuiFlexGroup alignItems="center">
      {!isOverallValid && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={errorList}>
            <EuiIcon type="alert" color="subdued" />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButton isDisabled={!isOverallValid} isLoading={isSaving} onClick={onClickSave} fill>
          {isEdit ? saveRuleButtonLabel : createRuleButtonLabel}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
