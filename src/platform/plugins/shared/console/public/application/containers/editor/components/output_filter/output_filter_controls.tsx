/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { useRequestReadContext } from '../../../../contexts';
import {
  useOutputFilterActionContext,
  useOutputFilterReadContext,
} from '../../../../contexts/output_filter_context';
import type { FilterMode } from '../../../../contexts/output_filter_context';
import { RegexExpressionInput } from './regex_expression_input';
import { JqExpressionInput } from './jq_expression_input';
import { FilterHelpModal } from './filter_help_modal';

const modeOptions = [
  {
    value: 'regex' as FilterMode,
    text: i18n.translate('console.outputFilter.mode.regex', { defaultMessage: 'Regular expression' }),
  },
  {
    value: 'jq' as FilterMode,
    text: i18n.translate('console.outputFilter.mode.jq', { defaultMessage: 'JQ expression' }),
  },
];

export const OutputFilterControls = () => {
  const {
    lastResult: { data },
  } = useRequestReadContext();
  const { expression: appliedExpression, mode: appliedMode, invertMatch: appliedInvertMatch } = useOutputFilterReadContext();
  const { setExpression, setMode, setInvertMatch } = useOutputFilterActionContext();

  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Draft state — only committed to context when Apply is clicked
  const [draftMode, setDraftMode] = useState<FilterMode>(appliedMode);
  const [draftExpression, setDraftExpression] = useState(appliedExpression);
  const [draftInvertMatch, setDraftInvertMatch] = useState(appliedInvertMatch);

  // Only show for a single successful response
  if (!data || data.length !== 1 || data[0].response.statusCode !== 200) return null;

  const isActive = appliedExpression.length > 0;

  const handleModeChange = (newMode: FilterMode) => {
    setDraftMode(newMode);
    setDraftExpression('');
    setDraftInvertMatch(false);
  };

  const handleApply = () => {
    setMode(draftMode);
    setExpression(draftExpression);
    setInvertMatch(draftInvertMatch);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftMode('regex');
    setDraftExpression('');
    setDraftInvertMatch(false);
    setMode('regex');
    setExpression('');
    setInvertMatch(false);
  };

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upLeft"
      panelPaddingSize="m"
      button={
        <EuiButtonEmpty
          size="xs"
          color={isActive ? 'primary' : 'text'}
          iconType="filter"
          data-test-subj="consoleOutputFilterButton"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isActive
            ? i18n.translate('console.outputFilter.button.active', {
                defaultMessage: 'Filter active',
              })
            : i18n.translate('console.outputFilter.button.label', {
                defaultMessage: 'Filter response',
              })}
        </EuiButtonEmpty>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s" style={{ minWidth: 300 }}>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('console.outputFilter.modeLabel', {
              defaultMessage: 'Filter response by',
            })}
            fullWidth
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiSelect
                  options={modeOptions}
                  value={draftMode}
                  onChange={(e) => handleModeChange(e.target.value as FilterMode)}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="question"
                  aria-label={i18n.translate('console.outputFilter.helpAriaLabel', {
                    defaultMessage: 'Filter expression help',
                  })}
                  onClick={() => setShowHelp(true)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem>
          {draftMode === 'regex' ? (
            <RegexExpressionInput
              value={draftExpression}
              onChange={setDraftExpression}
              invertMatch={draftInvertMatch}
              onInvertMatchChange={setDraftInvertMatch}
            />
          ) : (
            <JqExpressionInput
              value={draftExpression}
              onChange={setDraftExpression}
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            {isActive && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="danger"
                  onClick={handleClear}
                  data-test-subj="consoleOutputFilterClear"
                >
                  {i18n.translate('console.outputFilter.clearButton', { defaultMessage: 'Clear' })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                onClick={handleApply}
                data-test-subj="consoleOutputFilterApply"
              >
                {i18n.translate('console.outputFilter.applyButton', { defaultMessage: 'Apply' })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showHelp && <FilterHelpModal mode={draftMode} onClose={() => setShowHelp(false)} />}
    </EuiPopover>
  );
};
