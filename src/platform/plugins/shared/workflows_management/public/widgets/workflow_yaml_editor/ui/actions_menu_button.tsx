/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiButtonEmpty, EuiText, EuiTextColor } from '@elastic/eui';
import type { EuiButtonEmptyPropsForButton } from '@elastic/eui/src/components/button/button_empty/button_empty';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMac } from '@kbn/shared-ux-utility';
import { kbdStyles } from './kbd_styles';

type ActionsMenuButtonProps = Omit<EuiButtonEmptyPropsForButton, 'children'>;

export function ActionsMenuButton(props: ActionsMenuButtonProps) {
  const styles = useMemoCss(componentStyles);

  const commandKey = isMac ? '⌘' : 'Ctrl';

  return (
    <EuiButtonEmpty size="s" data-test-subj="workflowYamlEditorActionsMenuButton" {...props}>
      <EuiText css={{ display: 'flex', alignItems: 'center', gap: '6px' }} size="xs">
        <b>
          <FormattedMessage
            id="workflows.workflowDetail.yamlEditor.actionsMenu"
            defaultMessage="Actions menu"
          />
        </b>
        <EuiTextColor color="subdued" css={styles.withKbd}>
          <kbd>{commandKey}</kbd>
          <kbd>{'K'}</kbd>
        </EuiTextColor>
      </EuiText>
    </EuiButtonEmpty>
  );
}

const componentStyles = {
  withKbd: (euiThemeContext: UseEuiTheme) =>
    css({
      display: 'flex',
      gap: 2,
      '& kbd': kbdStyles(euiThemeContext),
    }),
};
