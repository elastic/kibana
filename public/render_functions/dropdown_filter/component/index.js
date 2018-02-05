import { compose, withState } from 'recompose';
import { DropdownFilter as Component } from './dropdown_filter';

export const DropdownFilter = compose(withState('value', 'onChange', ({ value }) => value || ''))(
  Component
);
