/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { checkScript } from '@elastic/micro-jq';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSplitPanel,
  EuiSwitch,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  useOutputFilterActionContext,
  useOutputFilterReadContext,
} from '../../../../contexts/output_filter_context';
import type { FilterMode } from '../../../../contexts/output_filter_context';
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

const isValidRegex = (expression: string): boolean => {
  if (!expression) return true;
  try {
    new RegExp(expression);
    return true;
  } catch {
    return false;
  }
};

export const OutputFilterRow = () => {
  const { expression: appliedExpression, mode: appliedMode, invertMatch: appliedInvertMatch } =
    useOutputFilterReadContext();
  const { setExpression, setMode, setInvertMatch } = useOutputFilterActionContext();

  const [draftExpression, setDraftExpression] = useState(appliedExpression);
  const [draftMode, setDraftMode] = useState<FilterMode>(appliedMode);
  const [draftInvertMatch, setDraftInvertMatch] = useState(appliedInvertMatch);
  const [showHelp, setShowHelp] = useState(false);

  const isInvalid =
    draftMode === 'regex'
      ? !isValidRegex(draftExpression)
      : draftExpression.length > 0 && !checkScript(draftExpression);

  const handleModeChange = (newMode: FilterMode) => {
    setDraftMode(newMode);
    setDraftExpression('');
    setDraftInvertMatch(false);
    setMode(newMode);
    setExpression('');
    setInvertMatch(false);
  };

  const handleExpressionChange = (value: string) => {
    setDraftExpression(value);
    if (value === '') {
      setExpression('');
    }
  };

  const handleBlur = () => {
    setExpression(draftExpression);
    setInvertMatch(draftInvertMatch);
  };

  const handleInvertMatchChange = (checked: boolean) => {
    setDraftInvertMatch(checked);
    setInvertMatch(checked);
  };

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={modeOptions}
            value={draftMode}
            onChange={(e) => handleModeChange(e.target.value as FilterMode)}
            compressed
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldText
            data-test-subj={draftMode === 'regex' ? 'filterRegex' : 'filterJq'}
            value={draftExpression}
            onChange={(e) => handleExpressionChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
            isInvalid={isInvalid}
            placeholder={
              draftMode === 'regex'
                ? i18n.translate('console.outputFilter.regex.placeholder', {
                    defaultMessage: 'Regular expression',
                  })
                : i18n.translate('console.outputFilter.jq.placeholder', {
                    defaultMessage: 'JQ expression',
                  })
            }
            compressed
            fullWidth
          />
        </EuiFlexItem>

        {draftMode === 'regex' && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="invertFilter"
              label={i18n.translate('console.outputFilter.regex.invertMatch', {
                defaultMessage: 'Invert match',
              })}
              checked={draftInvertMatch}
              onChange={(e) => handleInvertMatchChange(e.target.checked)}
              compressed
            />
          </EuiFlexItem>
        )}

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

      {showHelp && <FilterHelpModal mode={draftMode} onClose={() => setShowHelp(false)} />}
    </>
  );
};

export const OutputFilterExpandedPanel = () => {
  const { isExpanded } = useOutputFilterReadContext();
  const { euiTheme } = useEuiTheme();

  if (!isExpanded) return null;

  return (
    <EuiSplitPanel.Inner
      grow={false}
      paddingSize="xs"
      css={css`
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <OutputFilterRow />
    </EuiSplitPanel.Inner>
  );
};
