import { compose, withState, lifecycle } from 'recompose';
import { ESIndexSelect as Component } from './es_index_select';
import { fetch } from '../../../common/lib/fetch';
import chrome from 'ui/chrome';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}/api/canvas/es_indices`;

export const ESIndexSelect = compose(
  withState('indices', 'setIndices', []),
  lifecycle({
    componentDidMount() {
      fetch.get(`${apiPath}`)
      .then(res => {
        this.props.setIndices(res.data.sort());
      });
    },
  })
)(Component);
