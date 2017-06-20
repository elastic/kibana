import React from 'react';
import PropTypes from 'prop-types';
import { renderComponent, branch, setPropTypes, lifecycle, compose } from 'recompose';
import { getState, getError } from '../../lib/resolved_arg';
import { InvalidExpression } from './invalid_element';
import { Loading } from '../loading';

import './render_expression.less';

// if renderable isn't set, render the loading component
const renderableLoading = (renderable) => [null, 'pending'].includes(getState(renderable));
const renderLoading = branch(props => renderableLoading(props.renderable), renderComponent(Loading));

// if renderable is an error, render the invalid expression component
const renderInvalidExpression = branch(
  props => !props.expressionType || getError(props.renderable) !== null,
  renderComponent(InvalidExpression)
);

// dispatch renderable fetch if renderable isn't provided
const fetchRenderable = (props) => {
  if (getState(props.renderable) === null) props.fetchRenderable();
};

// add lifecycle hooks to component
const renderableLifecycle = lifecycle({
  componentWillMount() {
    fetchRenderable(this.props);
  },

  componentWillReceiveProps(newProps) {
    fetchRenderable(newProps);
  },

  componentWillUnmount() {
    this.props.destroyFn();
  },
});

const RenderExpressionComponent = (props) => {
  const { element, selectedElement, selectElement, removeElement, renderFn } = props;

  // TODO: pass in render element dimensions
  const style = { height: '500px', width: '700px' };
  const selectedClassName = element.id === selectedElement ? 'selected' : '';

  const renderElement = (domNode) => {
    if (domNode) renderFn(domNode);
  };

  return (
    <div className={`canvas__workpad--element ${selectedClassName}`} style={{ width: style.width }} onClick={selectElement}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ cursor: 'crosshair' }} onClick={removeElement}>[X]</span>
      </div>
      <div className="canvas__workpad--element_render" style={style}>
        <div style={style} ref={renderElement} />
      </div>
    </div>
  );
};

RenderExpressionComponent.propTypes = {
  element: PropTypes.object.isRequired,
  selectedElement: PropTypes.string,
  renderFn: PropTypes.func.isRequired,
  selectElement: PropTypes.func,
  removeElement: PropTypes.func,
};

export const RenderExpression = compose(
  setPropTypes({
    expressionType: PropTypes.string,
    renderable: PropTypes.object,
    destroyFn: PropTypes.func.isRequired,
  }),
  renderableLifecycle,
  renderLoading,
  renderInvalidExpression
)(RenderExpressionComponent);
