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

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { Link } from 'react-router'; // eslint-disable-line

import classNames from 'classnames';

export class GuideNav extends Component {
  constructor(props) {
    super(props);

    const currentRoute = props.routes[1];
    const nextRoute = this.props.getNextRoute(currentRoute.name);
    const previousRoute = this.props.getPreviousRoute(currentRoute.name);

    this.state = {
      search: '',
      nextRoute,
      previousRoute,
    };

    this.onSearchChange = this.onSearchChange.bind(this);
  }

  onSearchChange(event) {
    this.setState({
      search: event.target.value,
    });
  }

  componentWillReceiveProps(nextProps) {
    const currentRoute = nextProps.routes[1];
    const nextRoute = this.props.getNextRoute(currentRoute.name);
    const previousRoute = this.props.getPreviousRoute(currentRoute.name);

    this.setState({
      nextRoute,
      previousRoute,
    });
  }

  renderNoItems(name) {
    return <p className="guideNavNoItems">{`No ${name} match your search`}</p>;
  }

  renderPagination() {
    const previousClasses = classNames('guideNavPaginationButton', {
      'guideNavPaginationButton-isDisabled': !this.state.previousRoute,
    });

    const previousButton = (
      <Link
        className={previousClasses}
        to={this.state.previousRoute ? this.state.previousRoute.path : ''}
      >
        <span className="fa fa-angle-left" />
      </Link>
    );

    const nextClasses = classNames('guideNavPaginationButton', {
      'guideNavPaginationButton-isDisabled': !this.state.nextRoute,
    });

    const nextButton = (
      <Link className={nextClasses} to={this.state.nextRoute ? this.state.nextRoute.path : ''}>
        <span className="fa fa-angle-right" />
      </Link>
    );

    let hideChromeButton;

    if (this.props.isSandbox) {
      hideChromeButton = (
        <button
          className="guideLink"
          style={{ marginRight: '10px' }}
          onClick={this.props.onHideChrome}
        >
          Hide chrome
        </button>
      );
    }

    return (
      <div className="guideNavPaginationButtons">
        {hideChromeButton}
        {previousButton}
        {nextButton}
      </div>
    );
  }

  render() {
    const classes = classNames('guideNav', {
      'is-guide-nav-open': this.props.isNavOpen,
      'is-chrome-hidden': !this.props.isChromeVisible,
    });

    const buttonClasses = classNames('guideNav__menu fa fa-bars', {
      'is-menu-button-pinned': this.props.isNavOpen,
    });

    const componentNavItems = this.props.components
      .filter(item => item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1)
      .map((item, index) => {
        const icon = item.hasReact ? <div className="guideNavItem__reactLogo" /> : undefined;
        return (
          <div key={`componentNavItem-${index}`} className="guideNavItem">
            <Link className="guideNavItem__link" to={item.path} onClick={this.props.onClickNavItem}>
              {item.name}
            </Link>

            {icon}
          </div>
        );
      });

    const sandboxNavItems = this.props.sandboxes
      .filter(item => item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1)
      .map((item, index) => {
        const icon = item.hasReact ? <div className="guideNavItem__reactLogo" /> : undefined;
        return (
          <div key={`sandboxNavItem-${index}`} className="guideNavItem">
            <Link className="guideNavItem__link" to={item.path} onClick={this.props.onClickNavItem}>
              {item.name}
            </Link>

            {icon}
          </div>
        );
      });

    return (
      <div className={classes}>
        <div className="guideNav__header">
          <div className={buttonClasses} onClick={this.props.onToggleNav} />
          <Link className="guideNav__title" to="/" onClick={this.props.onClickNavItem}>
            Kibana UI Framework <span className="guideNav__version">{this.props.version}</span>
          </Link>
          <a
            href="http://elastic.co"
            className="guideNav__elasticLogo"
            aria-label="Go to the Elastic website"
          />

          {this.renderPagination()}
        </div>

        <div>
          <input
            type="text"
            placeholder="Search components and sandboxes"
            className="guideNavSearch"
            value={this.state.search}
            onChange={this.onSearchChange}
          />
        </div>

        <div className="guideNavItemsContainer">
          <div className="guideNavItems">
            <div className="guideNavSectionTitle">Components</div>

            {componentNavItems.length ? componentNavItems : this.renderNoItems('components')}

            <div className="guideNavSectionTitle">Sandboxes</div>

            {sandboxNavItems.length ? sandboxNavItems : this.renderNoItems('sandboxes')}
          </div>
        </div>

        <button className="guideLink guideNav__showButton" onClick={this.props.onShowChrome}>
          Show chrome
        </button>
      </div>
    );
  }
}

GuideNav.propTypes = {
  isChromeVisible: PropTypes.bool,
  isNavOpen: PropTypes.bool,
  isSandbox: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onHideChrome: PropTypes.func,
  onShowChrome: PropTypes.func,
  onClickNavItem: PropTypes.func,
  version: PropTypes.string,
  routes: PropTypes.array,
  getNextRoute: PropTypes.func,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};
