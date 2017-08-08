import { createElement } from 'react';
import PropTypes from 'prop-types';
import { FunctionForm } from '../function_form';

export const FunctionFormList = ({ functionFormItems }) => {
  const argTypeComponents = functionFormItems.map(spec => createElement(FunctionForm, spec));
  return createElement('div', null, ...argTypeComponents);
};

FunctionFormList.propTypes = {
  functionFormItems: PropTypes.array.isRequired,
};
