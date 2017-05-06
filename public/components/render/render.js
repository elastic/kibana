import React from 'react';
import PropTypes from 'prop-types';

import { elements } from '../../lib/elements';

export class Render extends React.PureComponent {
  componentWillUnmount() {
    const { expressionOutput } = this.props;
    const destroyFn = elements.get(expressionOutput.as).destroy;
    destroyFn(this.destroyMe);
  }

  renderElement(domNode) {
    if (!domNode) return;

    const { expressionOutput, done } = this.props;
    const renderFn = elements.get(expressionOutput.as).render;
    this.destroyMe = renderFn(domNode, expressionOutput.value, done);
  }

  render() {
    const style = { height: '200px', width: '700px' };
    return (
      <div style={style} ref={this.renderElement.bind(this)} />
    );
  }
}

Render.propTypes = {
  expressionOutput: PropTypes.object,
  expressionType: PropTypes.string,
  done: PropTypes.func,
};
