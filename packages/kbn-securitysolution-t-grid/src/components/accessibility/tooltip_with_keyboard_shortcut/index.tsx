/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiText, EuiScreenReaderOnly } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';

interface Props {
  additionalScreenReaderOnlyContext?: string;
  content: React.ReactNode;
  shortcut: string;
  showShortcut: boolean;
}

const TooltipWithKeyboardShortcutComponent = ({
  additionalScreenReaderOnlyContext = '',
  content,
  shortcut,
  showShortcut,
}: Props) => (
  <>
    <div data-test-subj="content">{content}</div>
    {additionalScreenReaderOnlyContext !== '' && (
      <EuiScreenReaderOnly data-test-subj="additionalScreenReaderOnlyContext">
        <p>{additionalScreenReaderOnlyContext}</p>
      </EuiScreenReaderOnly>
    )}
    {showShortcut && (
      <EuiText color="subdued" data-test-subj="shortcut" size="s" textAlign="center">
        <span>{i18n.PRESS}</span>
        {'\u00a0'}
        <span className="euiBadge euiBadge--hollow">{shortcut}</span>
      </EuiText>
    )}
  </>
);

export const TooltipWithKeyboardShortcut = React.memo(TooltipWithKeyboardShortcutComponent);
TooltipWithKeyboardShortcut.displayName = 'TooltipWithKeyboardShortcut';
