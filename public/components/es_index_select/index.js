import { compose, withState, lifecycle } from 'recompose';
import chrome from 'ui/chrome';
import { fetch } from '../../../common/lib/fetch';
import { ESIndexSelect as Component } from './es_index_select';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}/api/canvas/es_indices`;

export const ESIndexSelect = compose(
  withState('loading', 'setLoading', true),
  withState('indices', 'setIndices', []),
  lifecycle({
    componentDidMount() {
      fetch.get(`${apiPath}`).then(res => {
        this.props.setLoading(false);
        this.props.setIndices(res.data.sort());
      });
    },
  })
)(Component);
