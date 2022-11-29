/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';

export interface SuggestionSelectorProps {
  suggestions?: Suggestion[];
  activeSuggestion?: Suggestion;
  onSuggestionChange?: (sug: Suggestion | undefined) => void;
}

export const SuggestionSelector = ({
  suggestions,
  activeSuggestion,
  onSuggestionChange,
}: SuggestionSelectorProps) => {
  const suggestionOptions = suggestions
    ?.map((sug) => ({ label: sug.title, value: sug.visualizationId }))
    .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));

  const selectedSuggestion = activeSuggestion
    ? [{ label: activeSuggestion.title, value: activeSuggestion.visualizationId }]
    : [];

  const onSelectionChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      const suggestion = newOptions.length
        ? suggestions?.find((current) => current.visualizationId === newOptions[0].value)
        : undefined;

      onSuggestionChange?.(suggestion);
    },
    [onSuggestionChange, suggestions]
  );

  const [fieldPopoverDisabled, setFieldPopoverDisabled] = useState(false);
  const disableFieldPopover = useCallback(() => setFieldPopoverDisabled(true), []);
  const enableFieldPopover = useCallback(
    () => setTimeout(() => setFieldPopoverDisabled(false)),
    []
  );

  const { euiTheme } = useEuiTheme();
  const suggestionComboCss = css`
    width: 100%;
    max-width: ${euiTheme.base * 22}px;
  `;

  return (
    <EuiToolTip
      position="top"
      content={fieldPopoverDisabled ? undefined : activeSuggestion?.title}
      anchorProps={{ css: suggestionComboCss }}
    >
      <EuiComboBox
        data-test-subj="unifiedHistogramSuggestionSelector"
        prepend={i18n.translate('unifiedHistogram.suggestionSelectorLabel', {
          defaultMessage: 'Chart',
        })}
        placeholder={i18n.translate('unifiedHistogram.suggestionSelectorPlaceholder', {
          defaultMessage: 'Select chart',
        })}
        singleSelection={{ asPlainText: true }}
        options={suggestionOptions}
        selectedOptions={selectedSuggestion}
        onChange={onSelectionChange}
        compressed
        fullWidth={true}
        onFocus={disableFieldPopover}
        onBlur={enableFieldPopover}
      />
    </EuiToolTip>
  );
};
