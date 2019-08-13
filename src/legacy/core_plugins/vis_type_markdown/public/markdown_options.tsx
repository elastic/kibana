/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiLink,
  EuiIcon,
  EuiFormRow,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { MarkdownVisParams } from './types';

function MarkdownOptions({ stateParams, setValue }: VisOptionsProps<MarkdownVisParams>) {
  const onMarkdownUpdate = useCallback(
    (value: MarkdownVisParams['markdown']) => setValue('markdown', value),
    []
  );

  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>Markdown</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <EuiLink
              href="https://help.github.com/articles/github-flavored-markdown/"
              target="_blank"
            >
              <FormattedMessage id="visTypeMarkdown.params.helpLinkLabel" defaultMessage="Help" />{' '}
              <EuiIcon type="popout" size="s" />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFormRow fullWidth={true} compressed>
        <EuiTextArea
          id="markdownVisInput"
          value={stateParams.markdown}
          onChange={({ target: { value } }) => onMarkdownUpdate(value)}
          rows={20}
          fullWidth={true}
          data-test-subj="markdownTextarea"
          // resize="none"
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

export { MarkdownOptions };
