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

import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCopy,
  EuiButton,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export function Instruction({ commands, paramValues, textPost, textPre, replaceTemplateStrings }) {
  let pre;
  if (textPre) {
    pre = <Content text={replaceTemplateStrings(textPre)} />;
  }

  let post;
  if (textPost) {
    post = (
      <div>
        <EuiSpacer size="m" />
        <Content text={replaceTemplateStrings(textPost)} />
      </div>
    );
  }

  let copyButton;
  let commandBlock;
  if (commands) {
    const cmdText = commands
      .map((cmd) => {
        return replaceTemplateStrings(cmd, paramValues);
      })
      .join('\n');
    copyButton = (
      <EuiCopy textToCopy={cmdText}>
        {(copy) => (
          <EuiButton size="s" onClick={copy}>
            <FormattedMessage
              id="home.tutorial.instruction.copyButtonLabel"
              defaultMessage="Copy snippet"
            />
          </EuiButton>
        )}
      </EuiCopy>
    );
    commandBlock = (
      <div>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="sh">{cmdText}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <div>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>{pre}</EuiFlexItem>

        <EuiFlexItem className="homTutorial__instruction" grow={false}>
          {copyButton}
        </EuiFlexItem>
      </EuiFlexGroup>

      {commandBlock}

      {post}

      <EuiSpacer />
    </div>
  );
}

Instruction.propTypes = {
  commands: PropTypes.array,
  paramValues: PropTypes.object.isRequired,
  textPost: PropTypes.string,
  textPre: PropTypes.string,
  replaceTemplateStrings: PropTypes.func.isRequired,
};
