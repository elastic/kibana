import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import { CopyButton } from './copy_button';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export function Instruction({ commands, paramValues, textPost, textPre, replaceTemplateStrings }) {
  let pre;
  if (textPre) {
    pre = (
      <Content
        className="kuiVerticalRhythm"
        text={replaceTemplateStrings(textPre)}
      />
    );
  }

  let post;
  if (textPost) {
    post = (
      <Content
        className="kuiVerticalRhythm"
        text={replaceTemplateStrings(textPost)}
      />
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
      <div className="kuiVerticalRhythm">
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

        <EuiFlexItem grow={false}>
          {copyButton}
        </EuiFlexItem>
      </EuiFlexGroup>

      {commandBlock}

      {post}

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
