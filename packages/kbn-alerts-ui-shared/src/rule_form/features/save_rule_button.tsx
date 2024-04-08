/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { useCreateRuleApi } from '../apis';
import { useValidation } from '../contexts';

const createRuleButtonLabel = i18n.translate('alertsUIShared.ruleForm.createRuleButtonLabel', {
  defaultMessage: 'Create rule',
});

const saveRuleButtonLabel = i18n.translate('alertsUIShared.ruleForm.saveRuleButtonLabel', {
  defaultMessage: 'Save rule',
});

interface SaveRuleButtonProps {
  isEdit: boolean;
  onSuccessfulSave: (ruleId: string) => void;
}

export const SaveRuleButton: React.FC<SaveRuleButtonProps> = ({ isEdit, onSuccessfulSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const createRule = useCreateRuleApi();
  const { isOverallValid } = useValidation();

  const onClickSave = useCallback(async () => {
    setIsSaving(true);
    const newRule = await createRule();
    setIsSaving(false);
    onSuccessfulSave(newRule.id);
  }, [createRule, onSuccessfulSave]);

  return (
    <EuiButton
      isDisabled={!isOverallValid}
      isLoading={isSaving}
      onClick={isEdit ? () => {} : onClickSave}
      fill
    >
      {isEdit ? saveRuleButtonLabel : createRuleButtonLabel}
    </EuiButton>
  );
};
