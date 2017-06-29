import React from 'react';
import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';
import { PositionableChild } from './positionable_child';
import { Loading } from '../loading';
import { Positionable } from '../positionable';
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
    setPosition,
  } = props;

  return (
    <Positionable position={position} onChange={setPosition} interact={isSelected}>
      {/*
        Size will be passed to PositionableChild by Positionable
        size={{ width: position.width, height: position.height }}
      */}
      <PositionableChild
        select={select}
        remove={remove}
        isSelected={isSelected}
        elementTypeDefintion={elementTypeDefintion}
        renderable={renderable}
      />
      { /* size= will get passed to the children, but not all the way to RenderElement. F me. */ }
    </Positionable>
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
  setPosition: PropTypes.func,
};

export const ElementWrapper = compose(
  loadingBranch,
  invalidRenderTypeBranch,
  invalidExpressionBranch
)(ElementWrapperComponent);
