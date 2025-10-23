/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { FormattedMessage } from '@kbn/i18n-react';
import { isMac } from '../../../shared/utils/is_mac';

export function WorkflowYAMLEditorShortcuts() {
  const styles = useMemoCss(componentStyles);

  const commandKey = isMac() ? '⌘' : 'Ctrl';

  return (
    <div>
      <EuiText size="xs" css={styles.withKbd}>
        <p css={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <b>
            <FormattedMessage
              id="workflows.workflowDetail.yamlEditor.actionsMenu"
              defaultMessage="Actions menu"
            />
          </b>
          <EuiTextColor color="subdued">
            <kbd>{commandKey}</kbd> {'+'} <kbd>{'K'}</kbd>
          </EuiTextColor>
        </p>
      </EuiText>
    </div>
  );
}

const componentStyles = {
  withKbd: ({ euiTheme }: UseEuiTheme) =>
    css({
      '& kbd': {
        borderColor: euiTheme.colors.borderBaseSubdued,
      },
    }),
};
