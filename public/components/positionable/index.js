import { compose, withState } from 'recompose';
import { Positionable as Component } from './positionable';

export const Positionable = compose(withState('position', 'setPosition', props => props.position))(
  Component
);
