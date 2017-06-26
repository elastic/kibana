import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';
import { RenderElement } from '../render_element';
import { Loading } from '../loading';
import './element_wrapper.less';

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const loadingBranch = branch(({ renderable, renderableValue }) => {
  // no renderable or renderable config value
  return !renderable || !renderableValue;
}, renderComponent(Loading));
const invalidRenderTypeBranch = branch(({ renderableValue, renderableElement }) => {
  // renderable is available, but no matching element is found
  return (renderableValue && renderableValue.type !== 'render' && !renderableElement);
}, renderComponent(InvalidElementType));
const invalidExpressionBranch =  branch((props) => {
  const { renderableValue, renderableState, renderableElement } = props;
  // Show an error if...
  return (
    renderableState === 'error' || // The renderable has an error
    renderableValue.type !== 'render' || // The renderable isn't, well, renderable
    !renderableElement // We can't find an element in the registry for this
  );
}, renderComponent(InvalidExpression));

const ElementWrapperComponent = (props) => {
  const { element,
    selectedElement,
    selectElement,
    removeElement,
    renderableValue,
    renderableElement,
  } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = element.id === selectedElement ? 'selected' : '';

  return (
    <div className={`canvas__workpad--element ${selectedClassName}`} onClick={selectElement}>
      <div style={{ textAlign: 'right' }}>
        <i className="fa fa-times-circle" style={{ cursor: 'pointer' }} onClick={removeElement}/>
      </div>
      <RenderElement
        renderFn={renderableElement.render}
        destroyFn={renderableElement.destroy}
        config={renderableValue.value}
        done={() => {}}
      />
    </div>
  );
};

ElementWrapperComponent.propTypes = {
  element: PropTypes.object.isRequired,
  renderableValue: PropTypes.object,
  renderableState: PropTypes.string,
  renderableElement: PropTypes.object,
  selectedElement: PropTypes.string,
  selectElement: PropTypes.func,
  removeElement: PropTypes.func,
};

export const ElementWrapper = compose(
  loadingBranch,
  invalidRenderTypeBranch,
  invalidExpressionBranch
)(ElementWrapperComponent);
