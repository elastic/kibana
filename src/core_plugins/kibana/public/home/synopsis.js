import './synopsis.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiFlexGroup,
  KuiFlexItem
} from 'ui_framework/components';

export function Synopsis({ description, title, url }) {
  return (
    <KuiFlexGroup>
      <KuiFlexItem grow={false}>Icon</KuiFlexItem>
      <KuiFlexItem>
        <h4 className="kuiTextTitle">
          <a href={url} className="kuiLink">
            {title}
          </a>
        </h4>
        <p className="kuiText kuiSubduedText">
          {description}
        </p>
      </KuiFlexItem>
    </KuiFlexGroup>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
