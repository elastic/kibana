import React from 'react';
import _ from 'lodash';
import './editor_section.less';

export default class extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
    this.state = {open: props.open};
  }

  toggle() {
    this.setState({open: !this.state.open});
  }

  render() {
    const style = this.state.open ? {display: 'block'} : {display: 'none'};
    const toggleIcon = this.state.open ? 'fa fa-caret-down' : 'fa fa-caret-right';
    const stateClass = this.state.open ? 'open' : 'closed';
    return (
      <div className={`rework--editor-section ${stateClass}`}>
        <h4 onClick={this.toggle.bind(this)}><i className={toggleIcon}></i> {this.props.label} </h4>
        <div className={`rework--editor-section-content ${stateClass}`} style={style}>
          {this.props.children}
        </div>
      </div>
    );
  }
};
