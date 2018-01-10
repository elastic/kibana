import { createElement } from 'react';
import PropTypes from 'prop-types';
import { LabeledText } from './labeled_text';
import { LabeledSelect } from './labeled_select';

export const LabeledInput = props => {
  const { type } = props;
  if (type === 'select') return createElement(LabeledSelect, props);
  return createElement(LabeledText, props);
};

LabeledInput.propTypes = {
  type: PropTypes.string,
};
