import './instruction.less';
import React from 'react';
import PropTypes from 'prop-types';
import { Content } from './content';
import {
  KuiCodeEditor
} from 'ui_framework/components';
import 'brace/mode/sh';
import { replaceTemplateStrings } from './replace_template_strings';

export function Instruction({ commands, paramValues, textPost, textPre }) {
  let pre;
  if (textPre) {
    pre = <Content className="kuiVerticalRhythm" text={textPre}/>;
  }

  let post;
  if (textPost) {
    post = <Content className="kuiVerticalRhythm" text={textPost}/>;
  }

  const aceOptions = {
    fontSize: '14px',
    maxLines: commands.length
  };

  return (
    <div className="instruction">

      {pre}

      <div className="kuiVerticalRhythm">
        <KuiCodeEditor
          mode="sh"
          theme="github"
          width="100%"
          value={commands.map(cmd => { return replaceTemplateStrings(cmd, paramValues); }).join('\n')}
          setOptions={aceOptions}
          isReadOnly
        />
      </div>

      {post}

    </div>
  );
}

Instruction.propTypes = {
  commands: PropTypes.array.isRequired,
  paramValues: PropTypes.object.isRequired,
  textPost: PropTypes.string,
  textPre: PropTypes.string,
};
