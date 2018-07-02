import { compose, withState, lifecycle } from 'recompose';
import { getIndices } from '../../lib/es_service';
import { ESIndexSelect as Component } from './es_index_select';

export const ESIndexSelect = compose(
  withState('loading', 'setLoading', true),
  withState('indices', 'setIndices', []),
  lifecycle({
    componentDidMount() {
      getIndices().then((indices = []) => {
        this.props.setLoading(false);
        this.props.setIndices(indices.sort());
      });
    },
  })
)(Component);
