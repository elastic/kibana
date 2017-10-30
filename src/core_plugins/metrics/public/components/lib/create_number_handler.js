import _ from 'lodash';
import { detectIE } from './detect_ie';
export default (handleChange) => {
  return (name, defaultValue) => (e) => {
    if (!detectIE() || e.keyCode === 13) e.preventDefault();

    const value = Number(_.get(e, 'target.value', defaultValue));
    if (_.isFunction(handleChange)) {
      return handleChange({ [name]: value });
    }
  };
};