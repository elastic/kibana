import React from 'react';
import PropTypes from 'prop-types';

import './render_expression.less';

export class RenderExpression extends React.PureComponent {
  componentWillUnmount() {
    const { destroyFn } = this.props;
    destroyFn();
  }

  renderElement = (domNode) => {
    if (!domNode) return;
    const { renderFn } = this.props;
    renderFn(domNode);
  }

  render() {
    // TODO: pass in render element dimensions
    const style = { height: '500px', width: '700px' };
    const { element, selectedElement, selectElement } = this.props;
    const selectedClassName = element.id === selectedElement ? 'selected' : '';

    return (
      <div className={`canvas__workpad--element ${selectedClassName}`} onClick={selectElement} style={style}>
        <div style={style} ref={this.renderElement} />
      </div>
    );
  }
}

RenderExpression.propTypes = {
  expressionType: PropTypes.string,
  element: PropTypes.object,
  selectedElement: PropTypes.string,
  renderFn: PropTypes.func.isRequired,
  destroyFn: PropTypes.func.isRequired,
  selectElement: PropTypes.func,
};
