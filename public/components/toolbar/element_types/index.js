import { pure, compose, withProps } from 'recompose';
import { elements } from '../../../lib/elements';

import { ElementTypes as Component } from './element_types';

export const ElementTypes = compose(
  pure,
  withProps(() => ({ elements: elements.toJS() }))
)(Component);
