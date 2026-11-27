/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { EuiButton, EuiCodeBlock, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HousekeepingFix } from '../../common';
import { OpenInConsoleContext } from '../metadata';

const OPEN_IN_CONSOLE = i18n.translate('housekeeping.fix.openInConsole', {
  defaultMessage: 'Open in Console',
});

/** The request that resolves a finding. Nothing runs until the user sends it from Console. */
export const FixPanel = ({ fix }: { fix: HousekeepingFix }) => {
  const consoleActions = useContext(OpenInConsoleContext);
  const opensInNewTab = consoleActions?.opensInNewTab() ?? false;
  return (
    <EuiPanel color="subdued" paddingSize="s" hasBorder data-test-subj="housekeepingFix">
      <EuiText size="s">
        <p>{fix.description}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="text" fontSize="s" paddingSize="s" isCopyable>
        {fix.request}
      </EuiCodeBlock>
      {consoleActions && (
        <>
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            iconType={opensInNewTab ? 'external' : 'code'}
            onClick={() => consoleActions.open(fix.request)}
            data-test-subj="housekeepingOpenInConsole"
          >
            {OPEN_IN_CONSOLE}
          </EuiButton>
        </>
      )}
    </EuiPanel>
  );
};
