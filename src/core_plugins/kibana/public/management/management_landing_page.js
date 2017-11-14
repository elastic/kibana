import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class ManagementLandingPage extends Component {
  renderSection = (section, index) => {
    const items = section.visibleItems.map((item, itemIndex) => {
      const itemClasses = classNames('management-panel__link', {
        'management-panel__link--disabled': item.disabled || !item.url,
      });

      return (
        <li
          className="col-xs-4 col-md-3"
          key={itemIndex}
        >
          <a
            data-test-subj={item.name}
            className={itemClasses}
            href={item.disabled ? '' : this.props.addBasePath(item.url)}
          >
            {item.display}
          </a>
        </li>
      );
    });

    const iconClasses = classNames(
      'management-panel__heading-icon',
      `management-panel__heading-icon--${section.id}`,
    );

    return (
      <div
        className="page-row"
        key={index}
      >
        <div className="kuiPanel management-panel">
          <div className="kuiPanelHeader">
            <div className="kuiPanelHeaderSection">
              <div
                className={iconClasses}
              />

              <div className="kuiPanelHeader__title">
                {section.display}
              </div>
            </div>
          </div>

          <div className="kuiPanelBody management-panel__body">
            <div className="row">
              <ul className="list-unstyled">
                {items}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const {
      sections,
      version,
    } = this.props;

    const renderedSections =
      sections.filter(section => section.visibleItems.length > 0).map(this.renderSection);

    return (
      <div>
        <div className="page-row">
          <div className="page-row-text">Version: {version}</div>
        </div>

        {renderedSections}
      </div>
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
