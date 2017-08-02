import { createElement } from 'react';
import PropTypes from 'prop-types';
import { FunctionForm } from '../function_form';

export const FunctionFormListComponent = ({ functionFormItems }) => {
  const argTypeComponents = functionFormItems.map(spec => createElement(FunctionForm, spec));
  return createElement('div', null, ...argTypeComponents);
};

FunctionFormListComponent.propTypes = {
  functionFormItems: PropTypes.array.isRequired,
};
