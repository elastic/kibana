import _ from 'lodash';
import { detectIE } from './detect_ie';

export default (handleChange) => {
  return (name, defaultValue) => (e) => {
    // IE preventDefault breaks input, but we still need top prevent enter from being pressed
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    const value = _.get(e, 'target.value', defaultValue);
    if (_.isFunction(handleChange)) {
      return handleChange({ [name]: value });
    }
  };
};