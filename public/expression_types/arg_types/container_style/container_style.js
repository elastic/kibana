import { withHandlers } from 'recompose';
import { get } from 'lodash';
import { set } from 'object-path-immutable';
import { ArgType } from '../../arg_type';
import { getStringType } from '../../../../common/types/get_type';
import { simpleTemplate } from './simple_template';
import { extendedTemplate } from './extended_template';

import './container_style.less';

const wrap = (Component) => withHandlers({
  getArgValue: ({ argValue }) => (name, alt) => {
    const args = get(argValue, 'chain.0.arguments', {});
    return get(args, [name, 0, 'value'], alt);
  },
  setArgValue: ({ argValue, onValueChange }) => (name, val) => {
    const value = {
      value: val,
      type: getStringType(val),
    };
    const newValue = set(argValue, ['chain', 0, 'arguments', name, 0], value);
    onValueChange(newValue);
  },
})(Component);

export const containerStyle = () => new ArgType('containerStyle', {
  displayName: 'Image Upload',
  description: 'Select or upload an image',
  template: wrap(extendedTemplate),
  simpleTemplate: wrap(simpleTemplate),
});
