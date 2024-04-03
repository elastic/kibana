/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiComboBox,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  EuiFlexGroup,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';

export interface SuggestionSelectorProps {
  suggestions: Suggestion[];
  activeSuggestion?: Suggestion;
  onSuggestionChange?: (sug: Suggestion | undefined) => void;
}

export const SuggestionSelector = ({
  suggestions,
  activeSuggestion,
  onSuggestionChange,
}: SuggestionSelectorProps) => {
  let suggestionOptions = suggestions.map((sug) => {
    return {
      label: sug.title,
      value: sug.title,
    };
  });

  const selectedSuggestion = activeSuggestion
    ? [
        {
          label: activeSuggestion.title,
          value: activeSuggestion.title,
        },
      ]
    : [];

  if (activeSuggestion && !suggestions.find((s) => s.title === activeSuggestion.title)) {
    suggestionOptions = [
      ...suggestionOptions,
      {
        label: activeSuggestion.title,
        value: activeSuggestion.title,
      },
    ];
  }

  const onSelectionChange = useCallback(
    (newOptions) => {
      const suggestion = newOptions.length
        ? suggestions.find((current) => current.title === newOptions[0].value)
        : activeSuggestion;

      onSuggestionChange?.(suggestion);
    },
    [activeSuggestion, onSuggestionChange, suggestions]
  );

  const [suggestionsPopoverDisabled, setSuggestionaPopoverDisabled] = useState(false);
  const disableFieldPopover = useCallback(() => setSuggestionaPopoverDisabled(true), []);
  const enableFieldPopover = useCallback(
    () => setTimeout(() => setSuggestionaPopoverDisabled(false)),
    []
  );

  const { euiTheme } = useEuiTheme();
  const suggestionComboCss = css`
    width: 100%;
    max-width: ${euiTheme.base * 15}px;
  `;

  return (
    <EuiToolTip
      position="top"
      content={suggestionsPopoverDisabled ? undefined : activeSuggestion?.title}
      anchorProps={{ css: suggestionComboCss }}
      display="block"
      delay="long"
    >
      <EuiComboBox
        data-test-subj="unifiedHistogramSuggestionSelector"
        prepend={<EuiIcon type={activeSuggestion?.previewIcon ?? 'lensApp'} />}
        placeholder={i18n.translate('unifiedHistogram.suggestionSelectorPlaceholder', {
          defaultMessage: 'Select visualization',
        })}
        singleSelection={{ asPlainText: true }}
        options={suggestionOptions}
        selectedOptions={selectedSuggestion}
        onChange={onSelectionChange}
        fullWidth={true}
        isClearable={false}
        compressed
        onFocus={disableFieldPopover}
        onBlur={enableFieldPopover}
        renderOption={(option) => {
          const suggestion = suggestions.find((s) => {
            return s.title === option.label;
          });
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={null}>
                <EuiIcon type={suggestion?.previewIcon ?? 'lensApp'} />
              </EuiFlexItem>
              <EuiFlexItem>{option.label}</EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      />
    </EuiToolTip>
  );
};
