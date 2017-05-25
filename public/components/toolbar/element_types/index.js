import { pure, compose, withProps } from 'recompose';
import { elements } from '../../../lib/elements';

console.log(elements);

import { ElementTypes as Component } from './element_types';

export const ElementTypes = compose(withProps(() => ({ elements: elements.toJS() })))(pure(Component));
