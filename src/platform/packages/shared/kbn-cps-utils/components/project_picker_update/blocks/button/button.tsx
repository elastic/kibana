/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiToolTip,
  type EuiButtonProps,
  useGeneratedHtmlId,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import * as styles from './button.styles';
import { strings } from '../../../strings';
import { CPSIconDisabled } from '../../../cps_icon';

interface ProjectMetadata {
  filteredProjectsCount: number;
  totalProjectsCount: number;
}

export interface ProjectPickerButtonProps
  extends Pick<EuiButtonProps, 'size' | 'isDisabled'>,
    ProjectMetadata {
  onClick: () => void;
}

export const ProjectPickerButton = ({
  onClick,
  size,
  filteredProjectsCount,
  totalProjectsCount,
  isDisabled,
}: ProjectPickerButtonProps) => {
  const id = useGeneratedHtmlId();

  const allProjectsSelected = filteredProjectsCount === totalProjectsCount;

  return (
    <EuiToolTip content={strings.projectPickerButtonAriaLabel} id={id}>
      <EuiButton
        color="text"
        iconType={isDisabled ? CPSIconDisabled : 'crossProjectSearch'}
        aria-labelledby={id}
        size={size}
        isDisabled={isDisabled}
        onClick={onClick}
        css={styles.pickerButtonStyles}
        data-test-subj={`cps-project-picker-button${isDisabled ? '-disabled' : ''}`}
      >
        {isDisabled ? null : (
          <EuiText size="s" css={styles.pickerButtonLabelStyles}>
            <span data-test-subj="cps-project-picker-button-label">
              {allProjectsSelected
                ? strings.allButtonLabel
                : i18n.translate(
                    'cpsUtils.projectPicker.pickerButtonSelectionDifferentiationLabel',
                    {
                      defaultMessage: '{filterProjectsCount}/{totalProjectsCount}',
                      values: {
                        filterProjectsCount: numeral(filteredProjectsCount).format('0a'),
                        totalProjectsCount: numeral(totalProjectsCount).format('0a'),
                      },
                    }
                  )}
            </span>
          </EuiText>
        )}
      </EuiButton>
    </EuiToolTip>
  );
};
