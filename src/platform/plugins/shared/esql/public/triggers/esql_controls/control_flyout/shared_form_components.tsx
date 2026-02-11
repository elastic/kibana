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
import type { ESQLControlVariable } from '@kbn/esql-types';
import { EsqlControlType } from '@kbn/esql-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { TooltipWrapper } from '@kbn/visualization-utils';
import {
  EuiFieldText,
  EuiFormRow,
  EuiComboBox,
  EuiRadioGroup,
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
  EuiLink,
  EuiFlyoutHeader,
  EuiTitle,
  EuiBetaBadge,
  EuiToolTip,
  EuiText,
  EuiTextColor,
  EuiCode,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ServiceDeps } from '../../../kibana_services';
import { checkVariableExistence } from './helpers';

const controlTypeOptions = [
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.staticValuesLabel', {
      defaultMessage: 'Static values',
    }),
    'data-test-subj': 'staticValues',
    key: EsqlControlType.STATIC_VALUES,
  },
  {
    label: i18n.translate('esql.flyout.controlTypeOptions.valuesFromQueryLabel', {
      defaultMessage: 'Values from a query',
    }),
    'data-test-subj': 'valuesFromQuery',
    key: EsqlControlType.VALUES_FROM_QUERY,
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

const selectionTypeOptions = [
  {
    id: 'single',
    label: i18n.translate('esql.flyout.selectionType.single', {
      defaultMessage: 'Only allow a single selection',
    }),
  },
  {
    id: 'multi',
    label: i18n.translate('esql.flyout.selectionType.multi', {
      defaultMessage: 'Allow multiple selections',
    }),
  },
];

export function ControlType({
  isDisabled,
  initialControlFlyoutType,
  onFlyoutTypeChange,
}: {
  isDisabled: boolean;
  initialControlFlyoutType: EsqlControlType;
  onFlyoutTypeChange?: (flyoutType: EsqlControlType) => void;
}) {
  const controlFlyoutType = controlTypeOptions.find(
    (option) => option.key === initialControlFlyoutType
  )!;

  const onTypeChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      const flyoutType = controlTypeOptions.find(
        (option) => option.key === selectedOptions[0].key
      )!;
      onFlyoutTypeChange?.(flyoutType.key);
    },
    [onFlyoutTypeChange]
  );

  return (
    <>
      <TooltipWrapper
        tooltipContent={i18n.translate('esql.flyout.controlTypeOptionsOptions.disabledTooltip', {
          defaultMessage:
            'Currently, only the [Static values] type is available to replace functions or field names.',
        })}
        condition={isDisabled}
        anchorProps={{
          css: { width: '100%' },
        }}
      >
        <EuiFormRow
          label={i18n.translate('esql.flyout.controlTypeOptionsOptions.label', {
            defaultMessage: 'Type',
          })}
          fullWidth
        >
          <EuiComboBox
            aria-label={i18n.translate('esql.flyout.controlTypeOptionsOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            placeholder={i18n.translate('esql.flyout.controlTypeOptionsOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            singleSelection={{ asPlainText: true }}
            options={controlTypeOptions}
            selectedOptions={[controlFlyoutType]}
            onChange={onTypeChange}
            fullWidth
            isDisabled={isDisabled}
            compressed
            isClearable={false}
            data-test-subj="esqlControlTypeDropdown"
            inputPopoverProps={{
              'data-test-subj': 'esqlControlTypeInputPopover',
            }}
          />
        </EuiFormRow>
      </TooltipWrapper>
      <EuiSpacer size="m" />
    </>
  );
}

export function VariableName({
  variableName,
  isControlInEditMode,
  esqlVariables = [],
  onVariableNameChange,
}: {
  variableName: string;
  isControlInEditMode: boolean;
  esqlVariables?: ESQLControlVariable[];
  onVariableNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const tooltipContent = i18n.translate('esql.flyout.variableName.tooltipText', {
    defaultMessage:
      'Start your control name with ? to replace values or with ?? to replace field names or functions.',
  });

  const helpText = (
    <FormattedMessage
      id="esql.flyout.variableName.helpText"
      defaultMessage="Start your control name with {valuesPrefix} to replace {valuesBold} or with {fieldsPrefix} to replace {fieldsBold} or {functionsBold}."
      values={{
        valuesPrefix: <EuiCode>?</EuiCode>,
        fieldsPrefix: <EuiCode>??</EuiCode>,
        valuesBold: <strong>values</strong>,
        fieldsBold: <strong>fields</strong>,
        functionsBold: <strong>functions</strong>,
      }}
    />
  );
  const isDisabledTooltipText = i18n.translate('esql.flyout.variableName.disabledTooltip', {
    defaultMessage: 'You can’t edit a control name after it’s been created.',
  });
  const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
  const variableExists =
    checkVariableExistence(esqlVariables, variableName) && !isControlInEditMode;
  const errorMessage = !variableNameWithoutQuestionmark
    ? i18n.translate('esql.flyout.variableName.error', {
        defaultMessage: 'Variable name is required',
      })
    : variableExists
    ? i18n.translate('esql.flyout.variableNameExists.error', {
        defaultMessage: 'Variable name already exists',
      })
    : undefined;
  return (
    <EuiFormRow
      label={i18n.translate('esql.flyout.variableName.label', {
        defaultMessage: 'Name',
      })}
      helpText={helpText}
      fullWidth
      autoFocus
      isInvalid={!variableNameWithoutQuestionmark || variableExists}
      error={errorMessage}
    >
      <EuiToolTip
        content={isControlInEditMode ? isDisabledTooltipText : tooltipContent}
        css={css`
          width: 100%;
        `}
        display="block"
      >
        <EuiFieldText
          placeholder={i18n.translate('esql.flyout.variableName.placeholder', {
            defaultMessage: 'Set a variable name',
          })}
          disabled={isControlInEditMode}
          value={variableName}
          onChange={onVariableNameChange}
          aria-label={i18n.translate('esql.flyout.variableName.placeholder', {
            defaultMessage: 'Set a variable name',
          })}
          data-test-subj="esqlVariableName"
          fullWidth
          compressed
          tabIndex={0}
        />
      </EuiToolTip>
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
  const theme = useEuiTheme();

  return (
    <EuiFormRow
      label={i18n.translate('esql.flyout.label.label', {
        defaultMessage: 'Label',
      })}
      labelAppend={
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('esql.flyout.label.extraLabel', {
              defaultMessage: 'Optional',
            })}
          </EuiTextColor>
        </EuiText>
      }
      fullWidth
      css={css`
        margin-block-start: ${theme.euiTheme.size.base};
      `}
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
        data-test-subj="esqlControlLabel"
        fullWidth
        compressed
      />
    </EuiFormRow>
  );
}

export function ControlWidth({
  minimumWidth,
  grow,
  hideFitToSpace,
  onMinimumSizeChange,
  onGrowChange,
}: {
  minimumWidth: string;
  grow: boolean;
  hideFitToSpace: boolean;
  onMinimumSizeChange: (id: string) => void;
  onGrowChange: (e: EuiSwitchEvent) => void;
}) {
  return (
    <>
      <EuiFormRow
        label={i18n.translate('esql.flyout.minimumWidth.label', {
          defaultMessage: 'Minimum width',
        })}
        fullWidth
      >
        <EuiButtonGroup
          legend={i18n.translate('esql.flyout.minimumWidth.label', {
            defaultMessage: 'Minimum width',
          })}
          options={minimumWidthButtonGroup}
          idSelected={minimumWidth}
          onChange={(id) => onMinimumSizeChange(id)}
          type="single"
          isFullWidth
          data-test-subj="esqlControlMinimumWidth"
        />
      </EuiFormRow>
      {!hideFitToSpace && (
        <>
          <EuiSpacer size="m" />
          <EuiSwitch
            compressed
            label={i18n.translate('esql.flyout.grow.label', {
              defaultMessage: 'Expand width to fit available space',
            })}
            color="primary"
            checked={grow ?? false}
            onChange={(e) => onGrowChange(e)}
            data-test-subj="esqlControlGrow"
          />
        </>
      )}
    </>
  );
}

export function ControlSelectionType({
  singleSelect,
  onSelectionTypeChange,
}: {
  singleSelect: boolean;
  onSelectionTypeChange: (isSingleSelect: boolean) => void;
}) {
  const theme = useEuiTheme();
  const {
    services: { docLinks },
  } = useKibana<ServiceDeps>();
  const multiValuesGuideLink = docLinks?.links.query.queryESQLMultiValueControls ?? '';
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('esql.flyout.selectionType.label', {
          defaultMessage: 'Selections',
        })}
        fullWidth
      >
        <EuiRadioGroup
          compressed
          options={selectionTypeOptions}
          idSelected={singleSelect ? 'single' : 'multi'}
          onChange={(id) => {
            const newSingleSelect = id === 'single';
            onSelectionTypeChange(newSingleSelect);
          }}
          name="selectionType"
          data-test-subj="esqlControlSelectionType"
        />
      </EuiFormRow>
      {!singleSelect ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="primary"
            iconType="info"
            css={css`
              .euiText {
                color: ${theme.euiTheme.colors.textPrimary} !important;
              }
            `}
          >
            <EuiText size="s">
              <FormattedMessage
                id="esql.flyout.selectionType.callout"
                defaultMessage="You must use {mvContainsLink} in your ES|QL query for multi-select controls to work."
                values={{
                  mvContainsLink: (
                    <EuiLink href={multiValuesGuideLink} target="_blank">
                      MV_CONTAINS
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
}

export function Header({
  isInEditMode,
  ariaLabelledBy,
}: {
  isInEditMode: boolean;
  ariaLabelledBy: string;
}) {
  return (
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2 id={ariaLabelledBy}>
              {isInEditMode
                ? i18n.translate('esql.flyout.editTitle', {
                    defaultMessage: 'Edit variable control',
                  })
                : i18n.translate('esql.flyout.title', {
                    defaultMessage: 'Create variable control',
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
              tabIndex={0}
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
  onCancelControl,
  isSaveDisabled,
  closeFlyout,
  onCreateControl,
}: {
  isSaveDisabled: boolean;
  closeFlyout: () => void;
  onCreateControl: () => void;
  onCancelControl?: () => void;
}) {
  const onCancel = useCallback(() => {
    closeFlyout();
    onCancelControl?.();
  }, [closeFlyout, onCancelControl]);

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
