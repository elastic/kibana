import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { getState, getError, getValue } from '../../lib/resolved_arg';
import { InvalidExpression } from './invalid_element';
import { RenderElement } from '../render_element';
import { get } from 'lodash';
import { Loading } from '../loading';
import { elements as elementsRegistry } from '../../lib/elements';


import './element_wrapper.less';

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
});

const ElementWrapperComponent = (props) => {
  const { element, selectedElement, selectElement, removeElement, renderable } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = element.id === selectedElement ? 'selected' : '';

  function getElement() {
    if (!renderable || getState(renderable) === 'pending') return (<Loading/>); // No renderable? We haven't completed the first load yet.

    const renderableConfig = getValue(renderable);
    if (getError(renderable) !== null || renderableConfig.type == null) return (<InvalidExpression/>);

    const elementDef = elementsRegistry.get(get(getValue(renderable), 'as'));
    if (!elementDef) return (<InvalidExpression/>);

    return (<RenderElement renderFn={elementDef.render} destroyFn={elementDef.destroy} config={renderableConfig.value} done={() => {}}/>);
  }

  return (
    <div className={`canvas__workpad--element ${selectedClassName}`} onClick={selectElement}>
      <div style={{ textAlign: 'right' }}>
        <span style={{ cursor: 'crosshair' }} onClick={removeElement}>[X]</span>
      </div>
      {getElement()}
    </div>
  );
};

ElementWrapperComponent.propTypes = {
  element: PropTypes.object.isRequired,
  renderable: PropTypes.object,
  selectedElement: PropTypes.string,
  selectElement: PropTypes.func,
  removeElement: PropTypes.func,
};

export const ElementWrapper = compose(
  renderableLifecycle,
)(ElementWrapperComponent);
