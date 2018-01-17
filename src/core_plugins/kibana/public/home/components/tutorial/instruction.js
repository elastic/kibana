import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import { CopyButton } from './copy_button';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

export function Instruction({ commands, paramValues, textPost, textPre, replaceTemplateStrings }) {
  let pre;
  if (textPre) {
    pre = (
      <Content
        text={replaceTemplateStrings(textPre)}
      />
    );
  }

  let post;
  if (textPost) {
    post = (
      <div>
        <EuiSpacer size="m" />
        <Content
          text={replaceTemplateStrings(textPost)}
        />
      </div>
    );
  }

  let copyButton;
  let commandBlock;
  if (commands) {
    const cmdText = commands.map(cmd => { return replaceTemplateStrings(cmd, paramValues); }).join('\n');
    copyButton = (
      <CopyButton
        textToCopy={cmdText}
      />
    );
    commandBlock = (
      <div>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="sh">
          {cmdText}
        </EuiCodeBlock>
      </div>
    );
  }

  return (
    <div className="instruction">

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          {pre}
        </EuiFlexItem>

        <EuiFlexItem
          style={{ minWidth: 114 }}
          grow={false}
        >
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
