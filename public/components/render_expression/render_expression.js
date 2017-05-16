import React from 'react';
import PropTypes from 'prop-types';

export class RenderExpression extends React.PureComponent {
  componentWillUnmount() {
    const { destroyFn } = this.props;
    destroyFn();
  }

  renderElement(domNode) {
    if (!domNode) return;
    const { renderFn } = this.props;
    renderFn(domNode);
  }

  render() {
    const style = { height: '200px', width: '700px' };
    return (
      <div style={style} ref={this.renderElement.bind(this)} />
    );
  }
}

RenderExpression.propTypes = {
  expressionOutput: PropTypes.object,
  expressionType: PropTypes.string,
  renderFn: PropTypes.func,
  destroyFn: PropTypes.func,
};
