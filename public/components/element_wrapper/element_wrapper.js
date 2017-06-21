import React from 'react';
import PropTypes from 'prop-types';
import { lifecycle, compose, branch, renderComponent } from 'recompose';
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

/*
  Lifecycles methods
*/
const renderableLifecycle = lifecycle({
  componentWillMount() {
    fetchRenderable(this.props);
  },

  componentWillReceiveProps(newProps) {
    fetchRenderable(newProps);
  },
});

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const loadingBranch = branch(({ renderable }) => !renderable || getState(renderable) === 'pending', renderComponent(Loading));
const errorBranch =  branch(({ renderable }) => {
  const renderableConfig = getValue(renderable);

  // Show an error if...
  return (
    getError(renderable) !== null || // The renderable has an error property that is not null
    renderableConfig.type !== 'render' || // The renderable isn't, well, renderable
    !elementsRegistry.get(get(getValue(renderable), 'as')) // We can't find an element in the registry for this
  );
}, renderComponent(InvalidExpression));


const ElementWrapperComponent = (props) => {
  const { element, selectedElement, selectElement, removeElement, renderable } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = element.id === selectedElement ? 'selected' : '';

  const renderableConfig = getValue(renderable);
  const elementDef = elementsRegistry.get(get(getValue(renderable), 'as'));

  return (
    <div className={`canvas__workpad--element ${selectedClassName}`} onClick={selectElement}>
      <div style={{ textAlign: 'right' }}>
        <i className="fa fa-times-circle" style={{ cursor: 'pointer' }} onClick={removeElement}/>
      </div>
      <RenderElement renderFn={elementDef.render} destroyFn={elementDef.destroy} config={renderableConfig.value} done={() => {}}/>
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
  loadingBranch,
  errorBranch,
)(ElementWrapperComponent);
