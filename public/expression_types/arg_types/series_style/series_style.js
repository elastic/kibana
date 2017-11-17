import PropTypes from 'prop-types';
import { lifecycle } from 'recompose';
import { get } from 'lodash';
import { simpleTemplate } from './simple_template';
import { extendedTemplate } from './extended_template';
import './series_style.less';

const wrappedTemplate = lifecycle({
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
})(extendedTemplate);

wrappedTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export const seriesStyle = () => ({
  name: 'seriesStyle',
  displayName: 'Series Style',
  help: 'Set the style for a selected named series',
  template: wrappedTemplate,
  simpleTemplate,
});
