import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPage,
  EuiPageContentBody,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export class ManagementLandingPage extends Component {
  renderSections = sections => {
    return sections.map((section, index) => {
      const items = section.visibleItems.map((item, itemIndex) => {
        // TO-DO: Links need a disabled state
        return (
          <EuiFlexItem
            key={itemIndex}
          >
            <EuiLink
              data-test-subj={item.name}
              href={item.disabled ? '' : this.props.addBasePath(item.url)}
              isDisabled={item.disabled || !item.url}
            >
              {item.display}
            </EuiLink>
          </EuiFlexItem>
        );
      });

      const iconClasses = classNames(
        'management-panel__heading-icon',
        `management-panel__heading-icon--${section.id}`,
      );

      const title = (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <div className={iconClasses} />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiTitle>
              <h3>{section.display}</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      return (
        <div key={index}>
          <EuiPanel paddingSize="l">
            {title}
            <EuiHorizontalRule margin="s" />

            <EuiPageContentBody>
              <EuiFlexGroup>
                {items}
              </EuiFlexGroup>
            </EuiPageContentBody>
          </EuiPanel>

          {(index < sections.length - 1) &&
            <EuiSpacer size="m" />
          }
        </div>
      );
    });
  };

  render() {
    const {
      sections,
      version,
    } = this.props;

    const renderedSections =
      this.renderSections(sections.filter(section => section.visibleItems.length > 0));

    return (
      <EuiPage>
        <EuiText>
          <p>Version: {version}</p>
        </EuiText>

        <EuiSpacer size="l" />

        {renderedSections}
      </EuiPage>
    );
  }
}

ManagementLandingPage.propTypes = {
  sections: PropTypes.array,
  version: PropTypes.string,
  addBasePath: PropTypes.func,
};

ManagementLandingPage.defaultProps = {
  sections: [],
};
