/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlyoutBody, EuiSpacer, EuiText, type UseEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { css } from '@emotion/react';
import { CodeEditor } from '@kbn/code-editor';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UISession } from '../../types';

interface InspectFlyoutProps {
  searchSession: UISession;
}

export const InspectFlyout: React.FC<InspectFlyoutProps> = ({ searchSession }) => {
  const styles = useMemoCss(componentStyles);

  const renderInfo = () => {
    return (
      <div css={styles.jsonCodeEditor}>
        <CodeEditor
          languageId="json"
          value={JSON.stringify(searchSession, null, 2)}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </div>
    );
  };

  return (
    <EuiFlyoutBody css={styles.flyout} data-test-subj="searchSessionsFlyout">
      <EuiText>
        <EuiText size="xs">
          <p>
            <FormattedMessage
              id="data.sessions.management.backgroundSearchFlyoutText"
              defaultMessage="Configuration for this background search"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        {renderInfo()}
      </EuiText>
    </EuiFlyoutBody>
  );
};

const componentStyles = {
  flyout: css({
    '.euiFlyoutBody__overflowContent': {
      height: '100%',
      overflow: 'hidden',
      '> div': {
        height: '100%',
      },
    },
  }),
  jsonCodeEditor: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: `calc(100% - ${euiTheme.size.l})`,
    }),
};
