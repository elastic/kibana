/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiLink,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { MarkdownVisParams } from './types';

function MarkdownOptions({ stateParams, setValue }: VisEditorOptionsProps<MarkdownVisParams>) {
  const onMarkdownUpdate = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLTextAreaElement>) => setValue('markdown', value),
    [setValue]
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup direction="column" gutterSize="m" className="mkdEditor">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  <label htmlFor="markdownVisInput">Markdown</label>
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <EuiLink
                  href="https://help.github.com/articles/github-flavored-markdown/"
                  target="_blank"
                >
                  <FormattedMessage
                    id="visTypeMarkdown.params.helpLinkLabel"
                    defaultMessage="Help"
                  />
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTextArea
            id="markdownVisInput"
            className="visEditor--markdown__textarea"
            value={stateParams.markdown}
            onChange={onMarkdownUpdate}
            fullWidth={true}
            data-test-subj="markdownTextarea"
            resize="none"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export { MarkdownOptions };
