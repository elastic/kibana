import { compose, withState, lifecycle } from 'recompose';
import { getFields } from '../../lib/es_service';
import { ESFieldSelect as Component } from './es_field_select';

export const ESFieldSelect = compose(
  withState('fields', 'setFields', []),
  lifecycle({
    componentDidMount() {
      getFields(this.props.index).then(this.props.setFields);
    },
    componentDidUpdate({ index }) {
      if (this.props.index !== index) {
        getFields(this.props.index).then(this.props.setFields);
      }
    },
  })
)(Component);
