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
import { EuiButtonEmpty, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
export function QuickSearchAction({
  toggleVisor,
  hideKeyboardShortcut,
}: {
  toggleVisor: () => void;
  hideKeyboardShortcut?: boolean;
}) {
  const quickSearchLabel = i18n.translate('esqlEditor.visor.quickSearchLabel', {
    defaultMessage: 'Quick search',
  });

  const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
  const COMMAND_KEY = isMac ? '⌘' : 'CTRL';
  const shortCut = COMMAND_KEY + ' K';

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={quickSearchLabel} disableScreenReaderOutput>
          <EuiButtonEmpty
            size="xs"
            color="primary"
            flush="both"
            onClick={toggleVisor}
            data-test-subj="ESQLEditor-toggle-quick-search-visor"
            aria-label={quickSearchLabel}
            css={css`
              margin-right: ${euiTheme.size.m};
            `}
          >
            {hideKeyboardShortcut ? quickSearchLabel : `${quickSearchLabel} (${shortCut})`}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );
}
