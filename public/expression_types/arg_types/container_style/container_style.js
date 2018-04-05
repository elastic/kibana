import { withHandlers } from 'recompose';
import { get } from 'lodash';
import { set } from 'object-path-immutable';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';

import './container_style.less';

const wrap = Component =>
  // TODO: this should be in a helper
  withHandlers({
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
  simpleTemplate: templateFromReactComponent(wrap(SimpleTemplate)),
  template: templateFromReactComponent(wrap(ExtendedTemplate)),
});
