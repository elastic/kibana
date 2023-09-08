/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface FieldVisualizeButtonInnerProps {
  fieldName: string;
  handleVisualizeLinkClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  buttonProps?: Partial<EuiButtonProps>;
}

export const FieldCategorizeButtonInner: React.FC<FieldVisualizeButtonInnerProps> = ({
  fieldName,
  handleVisualizeLinkClick,
  buttonProps,
}) => {
  return (
    <>
      <EuiButton
        fullWidth
        size="s"
        data-test-subj={`fieldCategorize-${fieldName}`}
        {...(buttonProps || {})}
        onClick={handleVisualizeLinkClick}
        iconSide="left"
        iconType="machineLearningApp"
      >
        <FormattedMessage
          id="unifiedFieldList.fieldCategorizeButton.label"
          defaultMessage="Run pattern analysis"
        />
      </EuiButton>
    </>
  );
};
