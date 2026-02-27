/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { isMac } from '@kbn/shared-ux-utility';
import { EuiButtonEmpty, EuiButtonIcon, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';

const quickSearchLabel = i18n.translate('esqlEditor.visor.quickSearchLabel', {
  defaultMessage: 'Quick search',
});

const COMMAND_KEY = isMac ? '⌘' : 'CTRL';
const shortCut = COMMAND_KEY + ' K';

const quickSearchWithShortcut = `${quickSearchLabel} (${shortCut})`;

export function QuickSearchAction({
  toggleVisor,
  isSpaceReduced,
}: {
  toggleVisor: () => void;
  isSpaceReduced?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false} data-test-subj="ESQLEditor-toggle-query-history-icon">
          <EuiToolTip position="top" content={quickSearchWithShortcut} disableScreenReaderOutput>
            <EuiButtonIcon
              onClick={toggleVisor}
              iconType="search"
              data-test-subj="toggle-quick-search-visor"
              aria-label={quickSearchWithShortcut}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={quickSearchWithShortcut} disableScreenReaderOutput>
            <EuiButtonEmpty
              size="xs"
              color="primary"
              flush="both"
              onClick={toggleVisor}
              data-test-subj="ESQLEditor-toggle-quick-search-visor"
              aria-label={quickSearchWithShortcut}
              css={css`
                margin-right: ${euiTheme.size.m};
              `}
            >
              {quickSearchWithShortcut}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </>
  );
}
