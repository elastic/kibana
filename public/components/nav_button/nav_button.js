import React from 'react';
import './nav_button.less';
import classnames from 'classnames';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default class NavButton extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  render() {
    const {className, onClick, tooltip, id, disabled} = this.props;

    const activeControl = (
      <a className={className} onClick={onClick}>
        {this.props.children}
      </a>
    );

    const disabledControl = (
      <a className={className + ' disabled'}>
        {this.props.children}
      </a>
    );

    return (
      <div className='rework--nav-button' id={id}>
        <Tooltip content={tooltip}>
          { disabled ? disabledControl : activeControl }
        </Tooltip>
      </div>
    );
  }
};
