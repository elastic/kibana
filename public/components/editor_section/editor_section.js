import React from 'react';
import _ from 'lodash';
import './editor_section.less';

export default class extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  render() {
    return (
      <div className="rework--editor-section" data-element-type={name}>
        <h4><i className="fa fa-chevron-right"></i> {this.props.label} </h4>
        {this.props.children}
      </div>
    );
  }
};
