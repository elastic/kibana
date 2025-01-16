/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, KeyboardEvent, useCallback } from 'react';
import { EuiFieldSearch, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, keys } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { i18n } from '@kbn/i18n';
import {
  useInTableSearchMatches,
  UseInTableSearchMatchesProps,
} from './use_in_table_search_matches';

export interface InTableSearchControlProps extends UseInTableSearchMatchesProps {
  onChange: (searchTerm: string | undefined) => void;
}

export const InTableSearchControl: React.FC<InTableSearchControlProps> = ({
  onChange,
  ...props
}) => {
  const { matchesCount, activeMatchPosition, goToPrevMatch, goToNextMatch, isProcessing } =
    useInTableSearchMatches(props);

  const { inputValue, handleInputChange } = useDebouncedValue({
    onChange,
    value: props.inTableSearchTerm,
  });

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleInputChange(event.target.value);
    },
    [handleInputChange]
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (isProcessing) {
        return;
      }
      if (event.key === keys.ENTER && event.shiftKey) {
        goToPrevMatch();
      } else if (event.key === keys.ENTER) {
        goToNextMatch();
      }
    },
    [goToPrevMatch, goToNextMatch, isProcessing]
  );

  return (
    <EuiFieldSearch
      compressed
      isClearable
      isLoading={isProcessing}
      append={
        Boolean(inputValue?.length) && !isProcessing ? (
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            {matchesCount > 0 ? (
              <>
                <EuiFlexItem grow={false}>{`${activeMatchPosition} / ${matchesCount}`}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowUp"
                    aria-label={i18n.translate(
                      'unifiedDataTable.inTableSearch.buttonPreviousMatch',
                      {
                        defaultMessage: 'Previous match',
                      }
                    )}
                    disabled={activeMatchPosition <= 1}
                    onClick={goToPrevMatch}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="arrowDown"
                    aria-label={i18n.translate('unifiedDataTable.inTableSearch.buttonNextMatch', {
                      defaultMessage: 'Next match',
                    })}
                    disabled={activeMatchPosition >= matchesCount}
                    onClick={goToNextMatch}
                  />
                </EuiFlexItem>
              </>
            ) : (
              <EuiFlexItem grow={false}>0</EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : undefined
      }
      placeholder={i18n.translate('unifiedDataTable.inTableSearch.inputPlaceholder', {
        defaultMessage: 'Find in the table',
      })}
      value={inputValue}
      onChange={onInputChange}
      onKeyUp={onKeyUp}
    />
  );
};
