import React from 'react';
import PropTypes from 'prop-types';
import { CopyButton } from './copy_button';
import {
  KuiBar,
  KuiBarSection,
} from 'ui_framework/components';

export function CommandBlock({ commands, paramValues, replaceTemplateStrings }) {

  const cmdText = commands.map(cmd => { return replaceTemplateStrings(cmd, paramValues); }).join('\n');

  return (
    <div className="kuiVerticalRhythm">
      <div className="kuiVerticalRhythm">
        <KuiBar>
          <KuiBarSection>
            <CopyButton
              textToCopy={cmdText}
            />
          </KuiBarSection>
        </KuiBar>
      </div>
      <div className="kuiVerticalRhythm">
        <pre>
          {cmdText}
        </pre>
      </div>
    </div>
  );
}

CommandBlock.propTypes = {
  commands: PropTypes.array,
  paramValues: PropTypes.object.isRequired,
  replaceTemplateStrings: PropTypes.func.isRequired,
};
