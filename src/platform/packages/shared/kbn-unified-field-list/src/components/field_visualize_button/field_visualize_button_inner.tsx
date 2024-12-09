/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { VisualizeInformation } from './visualize_trigger_utils';

interface FieldVisualizeButtonInnerProps {
  field: DataViewField;
  visualizeInfo: VisualizeInformation;
  handleVisualizeLinkClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  buttonProps?: Partial<EuiButtonProps>;
}

export const FieldVisualizeButtonInner: React.FC<FieldVisualizeButtonInnerProps> = ({
  field,
  visualizeInfo,
  handleVisualizeLinkClick,
  buttonProps,
}) => {
  return (
    <>
      {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
      <EuiButton
        fullWidth
        size="s"
        data-test-subj={`fieldVisualize-${field.name}`}
        {...(buttonProps || {})}
        href={visualizeInfo.href}
        onClick={handleVisualizeLinkClick}
      >
        <FormattedMessage
          id="unifiedFieldList.fieldVisualizeButton.label"
          defaultMessage="Visualize"
        />
      </EuiButton>
    </>
  );
};
