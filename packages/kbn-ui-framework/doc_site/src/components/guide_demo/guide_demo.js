import PropTypes from 'prop-types';
import React, { Component } from 'react';

import classNames from 'classnames';

export class GuideDemo extends Component {
  componentDidMount() {
    this.update();
  }

  componentDidUpdate() {
    this.update();
  }

  update() {
    // We'll just render the children if we have them.
    if (this.props.children) {
      return;
    }

    // Inject HTML.
    this.content.innerHTML = this.props.html; // eslint-disable-line no-unsanitized/property

    // Inject JS.
    const js = document.createElement('script');
    js.type = 'text/javascript';
    js.innerHTML = this.props.js; // eslint-disable-line no-unsanitized/property
    this.content.appendChild(js);

    // Inject CSS.
    const css = document.createElement('style');
    css.innerHTML = this.props.css; // eslint-disable-line no-unsanitized/property
    this.content.appendChild(css);
  }

  render() {
    const {
      isFullScreen,
      isDarkTheme,
      children,
      className,
      js, // eslint-disable-line no-unused-vars
      html, // eslint-disable-line no-unused-vars
      css, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    const classes = classNames('guideDemo', className, {
      'guideDemo--fullScreen': isFullScreen,
      'guideDemo--darkTheme': isDarkTheme,
      'theme-dark': isDarkTheme,
    });

    return (
      <div
        className={classes}
        ref={c => (this.content = c)}
        {...rest}
      >
        {children}
      </div>
    );
  }
}

GuideDemo.propTypes = {
  children: PropTypes.node,
  js: PropTypes.string.isRequired,
  html: PropTypes.string.isRequired,
  css: PropTypes.string.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  isDarkTheme: PropTypes.bool.isRequired,
};

GuideDemo.defaultProps = {
  js: '',
  html: '',
  css: '',
  isFullScreen: false,
  isDarkTheme: false,
};
