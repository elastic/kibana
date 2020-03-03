/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiPanel,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiIcon,
  EuiSpacer,
  EuiToolTip,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const NUM_LONG_LINKS = 5;

export class RecentlyAccessed extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isPopoverOpen: false,
    };
  }

  onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  renderDropdown = () => {
    if (this.props.recentlyAccessed.length <= NUM_LONG_LINKS) {
      return;
    }

    const dropdownLinks = [];
    for (let i = NUM_LONG_LINKS; i < this.props.recentlyAccessed.length; i++) {
      dropdownLinks.push(
        <li
          style={{ marginBottom: 8 }}
          key={this.props.recentlyAccessed[i].id}
          data-test-subj={`moreRecentlyAccessedItem${this.props.recentlyAccessed[i].id}`}
        >
          <EuiLink
            className="homRecentlyAccessed__dropdownLink"
            href={this.props.recentlyAccessed[i].link}
          >
            {this.props.recentlyAccessed[i].label}
          </EuiLink>
        </li>
      );
    }

    const openPopoverComponent = (
      <EuiLink onClick={this.onButtonClick} data-test-subj="openMoreRecentlyAccessedPopover">
        <EuiTextColor className="homRecentlyAccessed__dropdownLabel" color="subdued">
          {`${dropdownLinks.length} more`}
        </EuiTextColor>
        <EuiIcon type="arrowDown" color="subdued" />
      </EuiLink>
    );

    let anchorPosition = 'downRight';
    if (window.innerWidth <= 768) {
      anchorPosition = 'downLeft';
    }

    return (
      <EuiPopover
        id="popover"
        ownFocus
        button={openPopoverComponent}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        anchorPosition={anchorPosition}
      >
        <ul>{dropdownLinks}</ul>
      </EuiPopover>
    );
  };

  renderLongLink = (recentlyAccessedItem, includeSeparator = false) => {
    let separator;
    if (includeSeparator) {
      separator = (
        <EuiFlexItem grow={false} className="homRecentlyAccessed__separator">
          <EuiText>
            <EuiIcon type="dot" color="subdued" />
          </EuiText>
        </EuiFlexItem>
      );
    }
    // Want to avoid a bunch of white space around items with short labels (happens when min width is too large).
    // Also want to avoid truncating really short names (happens when there is no min width)
    // Dynamically setting the min width based on label length meets both of these goals.
    const EM_RATIO = 0.65; // 'em' ratio that avoids too much horizontal white space and too much truncation
    const minWidth =
      (recentlyAccessedItem.label.length < 8 ? recentlyAccessedItem.label.length : 8) * EM_RATIO;
    const style = { minWidth: `${minWidth}em` };
    return (
      <React.Fragment key={recentlyAccessedItem.id}>
        {separator}
        <EuiFlexItem className="homRecentlyAccessed__item" style={style} grow={false}>
          <EuiToolTip
            anchorClassName="homRecentlyAccessed__anchor"
            position="bottom"
            content={recentlyAccessedItem.label}
          >
            <EuiLink className="homRecentlyAccessed__longLink" href={recentlyAccessedItem.link}>
              {recentlyAccessedItem.label}
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
      </React.Fragment>
    );
  };

  renderRecentlyAccessed = () => {
    if (this.props.recentlyAccessed.length <= NUM_LONG_LINKS) {
      return this.props.recentlyAccessed.map((item, index) => {
        let includeSeparator = true;
        if (index === 0) {
          includeSeparator = false;
        }
        return this.renderLongLink(item, includeSeparator);
      });
    }

    const links = [];
    for (let i = 0; i < NUM_LONG_LINKS; i++) {
      let includeSeparator = true;
      if (i === 0) {
        includeSeparator = false;
      }
      links.push(this.renderLongLink(this.props.recentlyAccessed[i], includeSeparator));
    }
    return links;
  };

  render() {
    return (
      <EuiPanel paddingSize="l">
        <EuiTitle size="xs">
          <h2>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="kbn.home.recentlyAccessed.recentlyViewedTitle"
                defaultMessage="Recently viewed"
              />
            </EuiTextColor>
          </h2>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd" wrap>
          <EuiFlexItem grow={false} className="homRecentlyAccessed__flexItem">
            <EuiFlexGroup>{this.renderRecentlyAccessed()}</EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>{this.renderDropdown()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
}

export const recentlyAccessedShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  link: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
});

RecentlyAccessed.propTypes = {
  recentlyAccessed: PropTypes.arrayOf(recentlyAccessedShape).isRequired,
};
