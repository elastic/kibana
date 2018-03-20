import PropTypes from 'prop-types';
import React from 'react';
import classnames from 'classnames';

import { KuiEmptyTablePromptMessage } from  './empty_table_prompt_message';
import { KuiEmptyTablePromptActions } from  './empty_table_prompt_actions';

export function KuiEmptyTablePrompt({ actions, message, className, ...rest }) {
  const classes = classnames('kuiEmptyTablePrompt', className);
  return (
    <div className={classes} {...rest} >
      <KuiEmptyTablePromptMessage>
        { message }
      </KuiEmptyTablePromptMessage>
      <KuiEmptyTablePromptActions>
        { actions }
      </KuiEmptyTablePromptActions>
    </div>
  );
}

KuiEmptyTablePrompt.propTypes = {
  message: PropTypes.string.isRequired,
  actions: PropTypes.node,
  className: PropTypes.string,
};
