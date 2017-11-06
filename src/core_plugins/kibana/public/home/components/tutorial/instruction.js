import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiCodeEditor
} from 'ui_framework/components';
import 'brace/mode/sh';

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

  const aceOptions = {
    fontSize: '14px',
    maxLines: commands.length,
    readOnly: true,
    highlightActiveLine: false,
    highlightGutterLine: false
  };

  return (
    <div className="instruction">

      {pre}

      <KuiCodeEditor
        className="kuiVerticalRhythm"
        mode="sh"
        theme="github"
        width="100%"
        value={commands.join('\n')}
        setOptions={aceOptions}
      />

      {post}

    </div>
  );
}

Instruction.propTypes = {
  commands: PropTypes.array.isRequired,
  textPost: PropTypes.string,
  textPre: PropTypes.string,
};
