/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

interface ExploreMatchingButtonProps {
  noDataViewMatches: boolean;
  indexMatches: number;
  dataViewSearchString: string;
  onCreateDefaultAdHocDataView?: (pattern: string) => void;
  setPopoverIsOpen: (isOpen: boolean) => void;
}

export const ExploreMatchingButton = ({
  noDataViewMatches,
  indexMatches,
  dataViewSearchString,
  setPopoverIsOpen,
  onCreateDefaultAdHocDataView,
}: ExploreMatchingButtonProps) => {
  const { euiTheme } = useEuiTheme();

  if (onCreateDefaultAdHocDataView && noDataViewMatches && indexMatches > 0) {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        data-test-subj="select-text-based-language-panel"
        css={css`
          margin: ${euiTheme.size.s};
          margin-bottom: 0;
        `}
      >
        <EuiFlexItem grow={true}>
          <EuiButton
            fullWidth
            size="s"
            onClick={() => {
              setPopoverIsOpen(false);
              onCreateDefaultAdHocDataView(dataViewSearchString);
            }}
          >
            {i18n.translate('unifiedSearch.query.queryBar.indexPattern.createForMatchingIndices', {
              defaultMessage: `Explore {indicesLength, plural,
              one {# matching index}
              other {# matching indices}}`,
              values: {
                indicesLength: indexMatches,
              },
            })}
          </EuiButton>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return null;
};
