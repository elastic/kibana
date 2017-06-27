import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';
import { RenderElement } from '../render_element';
import { Loading } from '../loading';
import { omit } from 'lodash';
import './element_wrapper.less';

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const loadingBranch = branch(({ state, renderable }) => {
  // no renderable or renderable config value
  return !state || !renderable;
}, renderComponent(Loading));

const invalidRenderTypeBranch = branch(({ renderable, elementTypeDefintion }) => {
  // renderable is available, but no matching element is found
  return (renderable && renderable.type !== 'render' && !elementTypeDefintion);
}, renderComponent(InvalidElementType));

const invalidExpressionBranch =  branch((props) => {
  const { renderable, state, elementTypeDefintion } = props;
  // Show an error if...
  return (
    state === 'error' || // The renderable has an error
    renderable.type !== 'render' || // The renderable isn't, well, renderable
    !elementTypeDefintion // We can't find an element in the registry for this
  );
}, renderComponent(InvalidExpression));

const ElementWrapperComponent = (props) => {
  const {
    select,
    remove,
    isSelected,
    elementTypeDefintion,
    renderable,
    position,
  } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = isSelected ? 'selected' : '';

  const style = Object.assign({ position: 'absolute' }, omit(position, 'rotation'));

  return (
    <div
      style={style}
      className={`canvas__workpad--element ${selectedClassName}`}
      onClick={select}>
      <div style={{ textAlign: 'right' }}>
        <i className="fa fa-times-circle" style={{ cursor: 'pointer' }} onClick={remove}/>
      </div>
      <RenderElement
        renderFn={elementTypeDefintion.render}
        destroyFn={elementTypeDefintion.destroy}
        config={renderable.value}
        done={() => {}}
      />
    </div>
  );
};

ElementWrapperComponent.propTypes = {
  select: PropTypes.func,
  remove: PropTypes.func,
  isSelected: PropTypes.bool,
  elementTypeDefintion: PropTypes.object,
  state: PropTypes.string,
  error: PropTypes.object,
  renderable: PropTypes.object,
  position: PropTypes.object,
};

export const ElementWrapper = compose(
  loadingBranch,
  invalidRenderTypeBranch,
  invalidExpressionBranch
)(ElementWrapperComponent);
