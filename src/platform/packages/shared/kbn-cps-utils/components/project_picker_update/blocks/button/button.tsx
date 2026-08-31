/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiToolTip,
  type EuiButtonProps,
  useGeneratedHtmlId,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import * as styles from './button.styles';
import { strings } from '../../../strings';
import { createProjectPickerContext } from '../../state';
import { CPSIconDisabled } from '../../../cps_icon';

export const tooltipDataTestSubj = 'cps-project-picker-button-tooltip';

export interface ProjectPickerButtonProps extends Pick<EuiButtonProps, 'size' | 'isDisabled'> {
  onClick: () => void;
  customTooltipContent?: string;
}

export const ProjectPickerButton = ({
  onClick,
  size,
  isDisabled,
  customTooltipContent,
}: ProjectPickerButtonProps) => {
  const id = useGeneratedHtmlId();
  const ProjectPickerContext = createProjectPickerContext();
  const context = useContext(ProjectPickerContext);

  const sharedButtonProps = {
    'aria-labelledby': id,
    size,
    css: styles.pickerButtonStyles,
  };

  if (isDisabled) {
    return (
      <EuiToolTip
        content={customTooltipContent ?? strings.projectPickerButtonDisabledAriaLabel}
        id={id}
        anchorProps={{
          'data-test-subj': tooltipDataTestSubj,
        }}
      >
        <EuiButtonIcon
          {...sharedButtonProps}
          color="text"
          iconType={CPSIconDisabled}
          isDisabled
          data-test-subj="cps-project-picker-button-disabled"
        />
      </EuiToolTip>
    );
  }

  if (!context) {
    throw new Error('useProjectPickerContext must be used within a ProjectPickerProvider');
  }

  const { state } = context;
  const filteredProjectsCount = state.selectedProjectIds.length;
  const totalProjectsCount = state.availableProjects.size;

  const allProjectsSelected = filteredProjectsCount === totalProjectsCount;
  const shouldWarn = filteredProjectsCount === 0;

  return (
    <EuiToolTip
      id={id}
      anchorProps={{
        'data-test-subj': tooltipDataTestSubj,
      }}
      content={customTooltipContent ?? strings.projectPickerButtonAriaLabel}
    >
      {shouldWarn ? (
        <EuiButton
          {...sharedButtonProps}
          color="warning"
          iconType="warning"
          onClick={onClick}
          data-test-subj="cps-project-picker-button"
        >
          <EuiText size="s" css={styles.pickerButtonLabelStyles}>
            <span data-test-subj="cps-project-picker-button-label">
              {i18n.translate('cpsUtils.projectPicker.pickerButtonSelectionDifferentiationLabel', {
                defaultMessage: '{filterProjectsCount}/{totalProjectsCount}',
                values: {
                  filterProjectsCount: numeral(filteredProjectsCount).format('0a'),
                  totalProjectsCount: numeral(totalProjectsCount).format('0a'),
                },
              })}
            </span>
          </EuiText>
        </EuiButton>
      ) : (
        <EuiButtonEmpty
          {...sharedButtonProps}
          color="text"
          onClick={onClick}
          iconType="crossProjectSearch"
          data-test-subj="cps-project-picker-button"
        >
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
        </EuiButtonEmpty>
      )}
    </EuiToolTip>
  );
};
