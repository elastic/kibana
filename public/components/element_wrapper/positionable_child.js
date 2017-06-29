/*
  This feels like a crummy hack but I need a way to make sure that Positionable is able to pass the
  size property all the way down to RenderElement.

  Positionable keeps size as local state because constantly pushing it through redux is too expensive,
  thus size is coming in via a child clone in Positionable. Gross right?
*/

import React from 'react';
import { pure } from 'recompose';
import PropTypes from 'prop-types';
import { RenderElement } from '../render_element';


export const PositionableChild = pure((props) => {
  const {
    select,
    remove,
    isSelected,

    // We could pull off the relevant properties of the following two objects,
    // but since they aren't used in the parent it would actually make this more
    // annoying to test and read
    elementTypeDefintion,
    renderable,
    size,
  } = props;

  // TODO: pass in render element dimensions
  const selectedClassName = isSelected ? 'selected' : '';

  return (
    <div
      className={`canvas__workpad--element ${selectedClassName}`}
      onClick={select}>
      <div style={{ pointerEvents: 'none' }}>
        <RenderElement
          renderFn={elementTypeDefintion.render}
          destroyFn={elementTypeDefintion.destroy}
          config={renderable.value}
          done={() => {}}
          size={size}
        />
      </div>
      {!isSelected ? null :
        (<i className="fa fa-times-circle canvas__workpad--element-remove" style={{ cursor: 'pointer' }} onClick={remove}/>)
      }
    </div>
  );
});

PositionableChild.propTypes = {
  select: PropTypes.func,
  remove: PropTypes.func,
  isSelected: PropTypes.bool,
  elementTypeDefintion: PropTypes.object,
  renderable: PropTypes.object,
  size: PropTypes.object,
};
