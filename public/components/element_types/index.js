import { pure, compose, withProps, withState } from 'recompose';
import { elementsRegistry } from '../../lib/elements_registry';

import { ElementTypes as Component } from './element_types';

const elementTypesState = withState('search', 'setSearch');
const elementTypeProps = withProps(() => ({ elements: elementsRegistry.toJS() }));

export const ElementTypes = compose(pure, elementTypesState, elementTypeProps)(Component);
