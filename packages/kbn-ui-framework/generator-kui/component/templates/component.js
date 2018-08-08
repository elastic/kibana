import React, {
  Component,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export class <%= componentName %> extends Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
  }

  constructor(props) {
    super(props);
  }

  render() {
    const {
      children,
      className,
      ...rest
    } = this.props;

    const classes = classNames('<%= cssClassName %>', className);

    return (
      <div
        className={classes}
        {...rest}
      >
        {children}
      </div>
    );
  }
}
