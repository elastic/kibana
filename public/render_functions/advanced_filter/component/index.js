import { compose, withState } from 'recompose';
import { AdvancedFilter as Component } from './advanced_filter';

export const AdvancedFilter = compose(withState('value', 'onChange', ({ filter }) => filter || ''))(
  Component
);
