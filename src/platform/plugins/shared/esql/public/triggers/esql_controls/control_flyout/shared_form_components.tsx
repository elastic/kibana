/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiButtonGroup,
  EuiSpacer,
  EuiSwitch,
  type EuiSwitchEvent,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutHeader,
  EuiTitle,
  EuiBetaBadge,
  EuiToolTip,
} from '@elastic/eui';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { esqlVariablesService } from '../../../../common';
import { EsqlControlFlyoutType } from '../types';

const controlTypeOptions = [
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.staticValuesLabel', {
      defaultMessage: 'Static Values',
    }),
    'data-test-subj': 'staticValues',
    key: EsqlControlFlyoutType.STATIC_VALUES,
  },
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.valuesFromQueryLabel', {
      defaultMessage: 'Values from a query',
    }),
    'data-test-subj': 'valuesFromQuery',
    key: EsqlControlFlyoutType.VALUES_FROM_QUERY,
  },
];

const minimumWidthButtonGroup = [
  {
    id: `small`,
    label: i18n.translate('esql.flyout.minimumWidth.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: `medium`,
    label: i18n.translate('esql.flyout.minimumWidth.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: `large`,
    label: i18n.translate('esql.flyout.minimumWidth.large', {
      defaultMessage: 'Large',
    }),
  },
];

export function ControlType({
  isDisabled,
  initialControlFlyoutType,
  setControlFlyoutType,
}: {
  isDisabled: boolean;
  initialControlFlyoutType: EsqlControlFlyoutType;
  setControlFlyoutType?: (flyoutType: EsqlControlFlyoutType) => void;
}) {
  const controlFlyoutType = controlTypeOptions.find(
    (option) => option.key === initialControlFlyoutType
  )!;

  const onFlyoutTypeChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      const flyoutType = controlTypeOptions.find(
        (option) => option.key === selectedOptions[0].key
      )!;
      setControlFlyoutType?.(flyoutType.key);
    },
    [setControlFlyoutType]
  );

  return (
    <EuiFormRow
      label={i18n.translate('esql.flyout.controlTypeOptions.label', {
        defaultMessage: 'Type',
      })}
      fullWidth
    >
      <EuiComboBox
        aria-label={i18n.translate('esql.flyout.controlTypeOptions.placeholder', {
          defaultMessage: 'Select a control type',
        })}
        placeholder={i18n.translate('esql.flyout.controlTypeOptions.placeholder', {
          defaultMessage: 'Select a control type',
        })}
        singleSelection={{ asPlainText: true }}
        options={controlTypeOptions}
        selectedOptions={[controlFlyoutType]}
        onChange={onFlyoutTypeChange}
        fullWidth
        isDisabled={isDisabled}
      />
    </EuiFormRow>
  );
}

export function VariableName({
  variableName,
  isControlInEditMode,
  onVariableNameChange,
}: {
  variableName: string;
  isControlInEditMode: boolean;
  onVariableNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <EuiFormRow
      label={i18n.translate('esql.flyout.variableName.label', {
        defaultMessage: 'Name',
      })}
      fullWidth
      autoFocus
      isInvalid={
        !variableName ||
        (esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode)
      }
      error={
        !variableName
          ? i18n.translate('esql.flyout.variableName.error', {
              defaultMessage: 'Variable name is required',
            })
          : esqlVariablesService.variableExists(variableName) && !isControlInEditMode
          ? i18n.translate('esql.flyout.variableNameExists.error', {
              defaultMessage: 'Variable name already exists',
            })
          : undefined
      }
    >
      <EuiFieldText
        placeholder={i18n.translate('esql.flyout.variableName.placeholder', {
          defaultMessage: 'Set a variable name',
        })}
        value={variableName}
        onChange={onVariableNameChange}
        aria-label={i18n.translate('esql.flyout.variableName.placeholder', {
          defaultMessage: 'Set a variable name',
        })}
        fullWidth
        disabled={isControlInEditMode}
      />
    </EuiFormRow>
  );
}

export function ControlLabel({
  label,
  onLabelChange,
}: {
  label: string;
  onLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <EuiFormRow
      label={i18n.translate('esql.flyout.label.label', {
        defaultMessage: 'Label',
      })}
      labelAppend={i18n.translate('esql.flyout.label.extraLabel', {
        defaultMessage: 'Optional',
      })}
      fullWidth
    >
      <EuiFieldText
        placeholder={i18n.translate('esql.flyout.label.placeholder', {
          defaultMessage: 'Set a label',
        })}
        value={label}
        onChange={onLabelChange}
        aria-label={i18n.translate('esql.flyout.label.placeholder', {
          defaultMessage: 'Set a label',
        })}
        fullWidth
      />
    </EuiFormRow>
  );
}

export function ControlWidth({
  minimumWidth,
  grow,
  onMinimumSizeChange,
  onGrowChange,
}: {
  minimumWidth: string;
  grow: boolean;
  onMinimumSizeChange: (id: string) => void;
  onGrowChange: (e: EuiSwitchEvent) => void;
}) {
  return (
    <>
      <EuiFormRow
        label={i18n.translate('esql.flyout.minimumWidth.label', {
          defaultMessage: 'Minimum Width',
        })}
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate('esql.flyout.minimumWidth.label', {
            defaultMessage: 'Minimum Width',
          })}
          options={minimumWidthButtonGroup}
          idSelected={minimumWidth}
          onChange={(id) => onMinimumSizeChange(id)}
          type="single"
          isFullWidth
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        label={i18n.translate('esql.flyout.grow.label', {
          defaultMessage: 'Expand width to fit available space',
        })}
        color="primary"
        checked={grow ?? false}
        onChange={(e) => onGrowChange(e)}
      />
    </>
  );
}

export function Header() {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('esql.flyout.title', {
                defaultMessage: 'Create ES|QL control',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            title={i18n.translate('esql.flyout.experimentalLabel.title', {
              defaultMessage: 'Technical preview',
            })}
            content={i18n.translate('esql.flyout.experimentalLabel.content', {
              defaultMessage: 'ES|QL variables are currently on Technical preview.',
            })}
          >
            <EuiBetaBadge
              label=""
              iconType="beaker"
              size="s"
              css={css`
                vertical-align: middle;
              `}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>
  );
}

export function Footer({
  isControlInEditMode,
  variableName,
  dashboardApi,
  isSaveDisabled,
  closeFlyout,
  onCreateControl,
}: {
  isControlInEditMode: boolean;
  variableName: string;
  dashboardApi: DashboardApi;
  isSaveDisabled: boolean;
  closeFlyout: () => void;
  onCreateControl: () => void;
}) {
  const onCancel = useCallback(() => {
    closeFlyout();
    // remove the variable from the service
    if (!isControlInEditMode && !esqlVariablesService.variableExists(variableName)) {
      esqlVariablesService.removeVariable(variableName);
    }

    const overlayTracker = tracksOverlays(dashboardApi) ? dashboardApi : undefined;
    overlayTracker?.clearOverlays();
  }, [closeFlyout, dashboardApi, isControlInEditMode, variableName]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            id="lnsCancelEditOnFlyFlyout"
            onClick={onCancel}
            flush="left"
            aria-label={i18n.translate('esql.flyout..cancelFlyoutAriaLabel', {
              defaultMessage: 'Cancel applied changes',
            })}
            data-test-subj="cancelEsqlControlsFlyoutButton"
          >
            {i18n.translate('esql.flyout.cancelLabel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onCreateControl}
            fill
            aria-label={i18n.translate('esql.flyout..applyFlyoutAriaLabel', {
              defaultMessage: 'Apply changes',
            })}
            disabled={isSaveDisabled}
            color="primary"
            iconType="check"
            data-test-subj="saveEsqlControlsFlyoutButton"
          >
            {i18n.translate('esql.flyout.saveLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
