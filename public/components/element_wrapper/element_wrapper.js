import React from 'react';
import PropTypes from 'prop-types';
import { ElementControls } from './element_controls';
import { Positionable } from '../positionable';
import './element_wrapper.less';


export const ElementWrapper = (props) => {
  const {
    select,
    remove,
    isSelected,
    elementTypeDefintion,
    renderable,
    position,
    setPosition,
    state,
  } = props;

  return (
    <Positionable position={position} onChange={setPosition} interact={isSelected}>
      {/*
        Size will be passed to PositionableChild by Positionable
        size={{ width: position.width, height: position.height }}
      */}
      <ElementControls
        select={select}
        remove={remove}
        isSelected={isSelected}
        elementTypeDefintion={elementTypeDefintion}
        renderable={renderable}
        state={state}
      />
    </Positionable>
  );
};

ElementWrapper.propTypes = {
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
