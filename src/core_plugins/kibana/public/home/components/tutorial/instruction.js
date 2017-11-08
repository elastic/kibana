import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import {
  KuiCodeEditor
} from 'ui_framework/components';
import 'brace/mode/sh';
import { replaceTemplateStrings } from './replace_template_strings';

export function Instruction({ commands, textPost, textPre }) {
  let pre;
  if (textPre) {
    pre = <Content text={textPre}/>;
  }

  let post;
  if (textPost) {
    post = <Content text={textPost}/>;
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
        value={commands.map(cmd => { return replaceTemplateStrings(cmd); }).join('\n')}
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
