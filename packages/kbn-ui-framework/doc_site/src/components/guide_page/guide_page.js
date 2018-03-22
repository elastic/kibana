import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  GuidePageSideNav,
  GuidePageSideNavItem,
} from '../';

export class GuidePage extends Component {
  constructor(props) {
    super(props);

    this.onClickLink = this.onClickLink.bind(this);
  }

  onClickLink(id) {
    // Scroll to element.
    $('html, body').animate({ // eslint-disable-line no-undef
      scrollTop: $(`#${id}`).offset().top - 100 // eslint-disable-line no-undef
    }, 250);
  }

  renderSideNavMenu() {
    // Traverse sections and build side nav from it.
    return this.props.sections.map((section, index) => {
      return (
        <GuidePageSideNavItem
          key={index}
          id={section.id}
          onClick={this.onClickLink}
        >
          {section.name}
        </GuidePageSideNavItem>
      );
    });
  }

  render() {
    return (
      <div className="guidePage">
        <GuidePageSideNav title={this.props.title}>
          {this.renderSideNavMenu()}
        </GuidePageSideNav>

        <div className="guidePageBody">
          <div style={{ marginBottom: 40, backgroundColor: '#ffec9d', padding: 20 }}>
            <h1 className="guideTitle">
              The Kibana UI Framework has been DEPRECATED.
            </h1>

            <h2 className="guideTitle">
              Please use the <a href="https://github.com/elastic/eui">EUI Framework instead</a>.
            </h2>
          </div>

          {this.props.children}
        </div>
      </div>
    );
  }
}

GuidePage.propTypes = {
  children: PropTypes.any,
  title: PropTypes.string,
  sections: PropTypes.array,
};
