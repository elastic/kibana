import { withHandlers } from 'recompose';
import { get } from 'lodash';
import { set } from 'object-path-immutable';
import { simpleTemplate } from './simple_template';
import { extendedTemplate } from './extended_template';

import './container_style.less';

const wrap = (Component) => withHandlers({
  getArgValue: ({ argValue }) => (name, alt) => {
    const args = get(argValue, 'chain.0.arguments', {});
    return get(args, [name, 0], alt);
  },
  setArgValue: ({ argValue, onValueChange }) => (name, val) => {
    const newValue = set(argValue, ['chain', 0, 'arguments', name, 0], val);
    onValueChange(newValue);
  },
})(Component);

export const containerStyle = () => ({
  name: 'containerStyle',
  displayName: 'Image Upload',
  help: 'Select or upload an image',
  template: wrap(extendedTemplate),
  simpleTemplate: wrap(simpleTemplate),
});
