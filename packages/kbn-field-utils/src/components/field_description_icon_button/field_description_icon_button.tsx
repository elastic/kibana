/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiPopover, EuiPopoverProps, useEuiTheme } from '@elastic/eui';
import { FieldDescription, FieldDescriptionProps } from '../field_description';

export type FieldDescriptionIconButtonProps = Pick<EuiPopoverProps, 'css'> & {
  field: FieldDescriptionProps['field'];
};

export const FieldDescriptionIconButton: React.FC<FieldDescriptionIconButtonProps> = ({
  field,
  ...otherProps
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  if (!field?.customDescription) {
    return null;
  }

  const buttonTitle = i18n.translate('fieldUtils.fieldDescriptionIconButtonTitle', {
    defaultMessage: 'View field description',
  });

  return (
    <span>
      <EuiPopover
        {...otherProps}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelProps={{
          css: css`
            max-width: ${euiTheme.base * 20}px;
          `,
        }}
        button={
          <EuiButtonIcon
            iconType="iInCircle"
            title={buttonTitle}
            aria-label={buttonTitle}
            size="xs"
            data-test-subj={`fieldDescriptionPopoverButton-${field.name}`}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          />
        }
      >
        <FieldDescription field={field} truncate={false} />
      </EuiPopover>
    </span>
  );
};
