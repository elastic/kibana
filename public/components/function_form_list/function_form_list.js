import React from 'react';
import PropTypes from 'prop-types';
import { FunctionForm } from '../function_form';

export const FunctionFormList = ({ functionFormItems }) => {
  const argTypeComponents = functionFormItems.map(functionFormProps => {
    return (
      <FunctionForm
        {...functionFormProps}
        key={`${functionFormProps.argType}-${functionFormProps.expressionIndex}`}
      />
    );
  });

  return <div>{argTypeComponents}</div>;
};

FunctionFormList.propTypes = {
  functionFormItems: PropTypes.array.isRequired,
};
