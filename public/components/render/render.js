import React from 'react';
import $ from 'jquery';
import { getType } from '../../../common/types/get_type';
import { elements } from '../../lib/elements';

export class Render extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  renderElement(domNode) {
    if (!domNode) return;

    if (getType(this.props.expressionOutput) !== 'render') {
      this.destroyMe = $(domNode).text('Waiting for expression to execute');
    } else {
      const renderFn = elements.get(this.props.expressionOutput.as).render;
      this.destroyMe = renderFn(domNode, this.props.expressionOutput.value, () => console.log('rendered!'));
    }
  }

  componentWillUnmount() {
    console.log(this.destroyMe);
  }

  render() {
    return (
      <div style={{ height: '200px', width: '700px' }} ref={this.renderElement.bind(this)}></div>
    );
  }
}
