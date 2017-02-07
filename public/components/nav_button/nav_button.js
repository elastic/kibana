import React from 'react';
import './nav_button.less';
import classnames from 'classnames';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default class NavButton extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  render() {
    const {className, onClick, tooltip, id} = this.props;

    return (
      <div className='rework--nav-button' id={id}>
        <Tooltip content={tooltip}>
          <a
            className={className}
            onClick={onClick}
            >
            {this.props.children}
          </a>
        </Tooltip>
      </div>
    );
  }
};
