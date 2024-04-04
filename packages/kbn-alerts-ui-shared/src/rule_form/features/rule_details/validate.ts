/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { RuleFormValidationError } from '../../types';
import { getStatusFromErrorObject, IncompleteError } from '../../common/validation_error';
import { useRuleFormSelector } from '../../hooks';

export const useValidateRuleDetails = () => {
  const { name } = useRuleFormSelector((state) => state.ruleDetails);
  return useMemo(() => {
    const errors = {
      name: new Array<RuleFormValidationError>(),
      tags: new Array<RuleFormValidationError>(),
    };

    if (!name) {
      errors.name.push(
        IncompleteError(
          i18n.translate('alertsUIShared.ruleForm.ruleDetails.errors', {
            defaultMessage: 'Name is required',
          })
        )
      );
    }

    return {
      errors,
      status: getStatusFromErrorObject(errors),
    };
  }, [name]);
};
export type RuleDetailsValidation = ReturnType<typeof useValidateRuleDetails>;
