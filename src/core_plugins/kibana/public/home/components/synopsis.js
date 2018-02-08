import './synopsis.less';
import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiIcon,
} from '@elastic/eui';

export function Synopsis({ description, iconUrl, iconType, title, url, wrapInPanel }) {
  let optionalImg;
  if (iconUrl) {
    optionalImg = (
      <EuiFlexItem grow={false}>
        <img
          className="synopsisIcon"
          src={iconUrl}
          alt=""
        />
      </EuiFlexItem>
    );
  } else if (iconType) {
    optionalImg = (
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={iconType}
          size="xl"
        />
      </EuiFlexItem>
    );
  }

  const content = (
    <EuiFlexGroup>
      {optionalImg}
      <EuiFlexItem className="synopsisContent">
        <EuiTitle size="s" className="synopsisTitle">
          <h4>
            {title}
          </h4>
        </EuiTitle>
        <EuiText className="synopsisBody">
          <p>
            <EuiTextColor color="subdued">
              {description}
            </EuiTextColor>
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  let synopsisDisplay = content;
  if (wrapInPanel) {
    synopsisDisplay = (
      <EuiPanel className="synopsisPanel">
        {content}
      </EuiPanel>
    );
  }

  return (
    <a
      href={url}
      className="euiLink synopsis"
      data-test-subj={`homeSynopsisLink${title.toLowerCase()}`}
    >
      {synopsisDisplay}
    </a>
  );
}

Synopsis.propTypes = {
  description: PropTypes.string.isRequired,
  iconUrl: PropTypes.string,
  iconType: PropTypes.string,
  title: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired
};
