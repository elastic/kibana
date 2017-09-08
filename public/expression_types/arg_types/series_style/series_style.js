import PropTypes from 'prop-types';
import { lifecycle } from 'recompose';
import { get } from 'lodash';
import { ArgType } from '../../arg_type';
import { simpleTemplate } from './simple_template';
import { extendedTemplate } from './extended_template';
import './series_style.less';

const formatLabel = (label) => `Style: ${label}`;

const wrappedTemplate = lifecycle({
  componentWillMount() {
    const label = get(this.props.argValue, 'chain.0.arguments.label.0', '');
    if (label) this.props.setLabel(formatLabel(label));
  },
  componentWillReceiveProps(newProps) {
    const newLabel = get(newProps.argValue, 'chain.0.arguments.label.0', '');
    if (newLabel && this.props.label !== formatLabel(newLabel)) {
      this.props.setLabel(formatLabel(newLabel));
    }
  },
})(extendedTemplate);

wrappedTemplate.propTypes = {
  argValue: PropTypes.object.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export const seriesStyle = () => new ArgType('seriesStyle', {
  displayName: 'Series Style',
  description: 'Set the style for a selected named series',
  template: wrappedTemplate,
  simpleTemplate,
});
