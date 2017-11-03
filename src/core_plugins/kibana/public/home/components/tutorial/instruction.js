import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';

export function Instruction({ commands, textPost, textPre }) {
  let pre;
  if (textPre) {
    pre = (
      <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
        {textPre}
      </p>
    );
  }

  let post;
  if (textPost) {
    post = (
      <p className="kuiText kuiSubduedText kuiVerticalRhythm kuiVerticalRhythmSmall">
        {textPost}
      </p>
    );
  }

  return (
    <div className="instruction">

      {pre}

      <pre className="kuiVerticalRhythm">
        <code>
          {commands.map(command => (command))}
        </code>
      </pre>

      {post}

    </div>
  );
}

Instruction.propTypes = {
  commands: PropTypes.array.isRequired,
  textPost: PropTypes.string,
  textPre: PropTypes.string,
};
