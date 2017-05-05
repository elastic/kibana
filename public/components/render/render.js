import React from 'react';
import $ from 'jquery';
import { getType } from '../../../common/types/get_type';

export class Render extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  renderElement(domNode) {
    if (getType(this.props.expressionOutput) !== 'render') {
      this.destroyMe = $(domNode).text('Waiting for expression to execute');
    } else {
      this.destroyMe = $(domNode).text(JSON.stringify(this.props.expressionOutput));
    }
  }

  componentWillUnmount() {
    console.log(this.destroyMe);
  }

  render() {
    return (
      <div style={{ height: '200px', width: '500px' }} ref={this.renderElement.bind(this)}></div>
    );
  }
}
