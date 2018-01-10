import { compose, withState } from 'recompose';

import { ColorManager as Component } from './color_manager';

export const ColorManager = compose(withState('adding', 'setAdding', false))(Component);
