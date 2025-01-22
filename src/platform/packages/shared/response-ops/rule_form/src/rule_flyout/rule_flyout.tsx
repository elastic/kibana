/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyout, EuiPortal } from '@elastic/eui';
import React from 'react';
import type { RuleFormData } from '../types';
import { RuleFlyoutBody } from './rule_flyout_body';

interface RuleFlyoutProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
}

// Wrapper component for the rule flyout. Currently only displays RuleFlyoutBody, but will be extended to conditionally
// display the Show Request UI or the Action Connector UI. These UIs take over the entire flyout, so we need to swap out
// their body elements entirely to avoid adding another EuiFlyout element to the DOM
export const RuleFlyout = ({ onSave, isEdit, isSaving, onCancel = () => {} }: RuleFlyoutProps) => {
  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={onCancel}
        aria-labelledby="flyoutTitle"
        size="m"
        maxWidth={500}
        className="ruleFormFlyout__container"
      >
        <RuleFlyoutBody onSave={onSave} onCancel={onCancel} isEdit={isEdit} isSaving={isSaving} />
      </EuiFlyout>
    </EuiPortal>
  );
};
