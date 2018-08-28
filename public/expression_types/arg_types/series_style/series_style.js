import PropTypes from 'prop-types';
import { lifecycle } from 'recompose';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';

const EnhancedExtendedTemplate = lifecycle({
  formatLabel(label) {
    if (typeof label !== 'string') this.props.renderError();
    return `Style: ${label}`;
  },
  componentWillMount() {
    const label = get(this.props.argValue, 'chain.0.arguments.label.0', '');
    if (label) this.props.setLabel(this.formatLabel(label));
  },
  componentWillReceiveProps(newProps) {
    const newLabel = get(newProps.argValue, 'chain.0.arguments.label.0', '');
    if (newLabel && this.props.label !== this.formatLabel(newLabel)) {
      this.props.setLabel(this.formatLabel(newLabel));
    }
  },
})(ExtendedTemplate);

EnhancedExtendedTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export const seriesStyle = () => ({
  name: 'seriesStyle',
  displayName: 'Series Style',
  help: 'Set color, select line sizes, and more. Expand to select the series you want to style',
  template: templateFromReactComponent(EnhancedExtendedTemplate),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
});
