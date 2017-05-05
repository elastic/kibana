import React from 'react';
import PropTypes from 'prop-types';

import { elements } from '../../lib/elements';

export class Render extends React.PureComponent {
  renderElement(domNode) {
    if (!domNode) return;

    const { expressionType, expressionOutput } = this.props;
    if (expressionType !== 'render') {
      domNode.innerHTML = 'Waiting for expression to execute';
    } else {
      const renderFn = elements.get(expressionOutput.as).render;
      this.destroyMe = renderFn(domNode, expressionOutput.value, () => console.log('rendered!'));
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

Render.propTypes = {
  expressionOutput: PropTypes.object,
  expressionType: PropTypes.string,
};
