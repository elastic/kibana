import { createElement } from 'react';
import PropTypes from 'prop-types';
import { ArgType } from '../arg_type';

export const ArgTypesComponent = ({ argTypeItems }) => {
  const argTypeComponents = argTypeItems.map(spec => createElement(ArgType, spec));
  return createElement('div', null, ...argTypeComponents);
};

ArgTypesComponent.propTypes = {
  argTypeItems: PropTypes.array.isRequired,
};
