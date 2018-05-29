import { PureComponent } from 'react';
import PropTypes from 'prop-types';

export class DefaultFormatEditor extends PureComponent {
  static propTypes = {
    format: PropTypes.object.isRequired,
    formatParams: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      sampleInputs: [],
      error: null,
      samples: [],
    };
  }

  static getDerivedStateFromProps(nextProps, state) {
    const converter = nextProps.format.getConverterFor('text');
    const type = typeof state.sampleInputsByType === 'object' && nextProps.formatParams.type;
    const inputs = type ? state.sampleInputsByType[nextProps.formatParams.type] || [] : state.sampleInputs;

    let error = null;
    let samples = [];

    try {
      samples = inputs.map(input => {
        return {
          input,
          output: converter(input),
        };
      });
    } catch(e) {
      error = `An error occured while trying to use this format configuration: ${e.message}`;
    }

    return {
      error,
      samples,
    };
  }

  onChange = (name, value) => {
    const { onChange, formatParams } = this.props;
    const newParams = { ...formatParams };
    newParams[name] = value;
    onChange(newParams);
  };
}
