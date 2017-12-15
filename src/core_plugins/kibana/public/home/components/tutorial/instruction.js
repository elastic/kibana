import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import { CommandBlock } from './command_block';

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

  let commandBlock;
  if (commands) {
    commandBlock = (
      <CommandBlock
        commands={commands}
        paramValues={paramValues}
        replaceTemplateStrings={replaceTemplateStrings}
      />
    );
  }

  return (
    <div className="instruction">

      {pre}

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
