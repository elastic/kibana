import React from 'react';
import PropTypes from 'prop-types';
import { pure, compose, branch, renderComponent, withProps } from 'recompose';
import Style from 'style-it';
import { Loading } from '../loading';
import { RenderWithFn } from '../render_with_fn';
import { getType } from '../../../common/lib/get_type';
import { InvalidExpression } from './invalid_expression';
import { InvalidElementType } from './invalid_element_type';

/*
  Branches
  Short circut rendering of the element if the element isn't ready or isn't valid.
*/
const branches = [
  // no renderable or renderable config value, render loading
  branch(({ renderable, state }) => {
    return !state || !renderable;
  }, renderComponent(Loading)),

  // renderable is available, but no matching element is found, render invalid
  branch(({ renderable, renderFunction }) => {
    return renderable && getType(renderable) !== 'render' && !renderFunction;
  }, renderComponent(InvalidElementType)),

  // error state, render invalid expression notice
  branch(({ renderable, renderFunction, state }) => {
    return (
      state === 'error' || // The renderable has an error
      getType(renderable) !== 'render' || // The renderable isn't, well, renderable
      !renderFunction // We can't find an element in the registry for this
    );
  }, renderComponent(InvalidExpression)),
  withProps(({ handlers }) => ({
    handlers: {
      done() {},
      ...handlers,
    },
  })),
];

// NOTE: the data-shared-* attributes here are used for reporting
export const ElementContent = compose(pure, ...branches)(
  ({ renderable, renderFunction, size, handlers }) => {
    return Style.it(
      renderable.css,
      <div style={{ ...renderable.containerStyle, ...size }}>
        <div className="canvas__element--content" data-shared-item>
          <RenderWithFn
            name={renderFunction.name}
            renderFn={renderFunction.render}
            reuseNode={renderFunction.reuseDomNode}
            config={renderable.value}
            css={renderable.css} // This is an actual CSS stylesheet string, it will be scoped by RenderElement
            size={size} // Size is only passed for the purpose of triggering the resize event, it isn't really used otherwise
            handlers={handlers}
          />
        </div>
      </div>
    );
  }
);

ElementContent.propTypes = {
  renderable: PropTypes.object,
  renderFunction: PropTypes.object,
  size: PropTypes.object,
  handlers: PropTypes.object,
  state: PropTypes.string,
};
