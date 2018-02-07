import './recently_accessed.less';
import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiButtonEmpty,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';

export const NUM_LONG_LINKS = 5;

export class RecentlyAccessed extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick() {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  }

  closePopover() {
    this.setState({
      isPopoverOpen: false,
    });
  }

  renderDropdown = () => {
    const dropdownLinks = [];
    for (let i = NUM_LONG_LINKS; i < this.props.recentlyAccessed.length; i++) {
      dropdownLinks.push(this.renderLink(
        this.props.recentlyAccessed[i].link,
        this.props.recentlyAccessed[i].label));
    }

    const button = (
      <EuiButtonEmpty
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick.bind(this)}
      >
        {`+${dropdownLinks.length}`}
      </EuiButtonEmpty>
    );

    return (
      <EuiFlexItem
        key="dropdown"
        grow={false}
      >
        <EuiPopover
          id="popover"
          ownFocus
          button={button}
          isOpen={this.state.isPopoverOpen}
          closePopover={this.closePopover.bind(this)}
        >
          <div style={{ maxWidth: '200px' }}>
            {dropdownLinks}
          </div>
        </EuiPopover>
      </EuiFlexItem>
    );
  }

  renderLink = (link, label) => {
    return (
      <EuiFlexItem
        style={{ overflow: 'hidden' }}
        key={link}
      >
        <EuiButtonEmpty
          href={link}
        >
          {label}
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  }

  renderRecentlyAccessed = () => {
    if (this.props.recentlyAccessed.length <= NUM_LONG_LINKS) {
      return this.props.recentlyAccessed.map((item) => {
        return this.renderLink(item.link, item.label);
      });
    }

    const links = [];
    for (let i = 0; i < NUM_LONG_LINKS; i++) {
      links.push(this.renderLink(
        this.props.recentlyAccessed[i].link,
        this.props.recentlyAccessed[i].label));
    }

    return [
      ...links,
      this.renderDropdown()
    ];
  };

  render() {
    return (
      <EuiPanel paddingSize="l">
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              Recently accessed
            </EuiTextColor>
          </p>
        </EuiText>

        <EuiFlexGroup>
          {this.renderRecentlyAccessed()}
        </EuiFlexGroup>

      </EuiPanel>
    );
  }
}

export const recentlyAccessedShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
});

RecentlyAccessed.propTypes = {
  recentlyAccessed: PropTypes.arrayOf(recentlyAccessedShape).isRequired
};
