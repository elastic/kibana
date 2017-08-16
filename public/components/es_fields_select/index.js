import { compose, withState, lifecycle } from 'recompose';
import { ESFieldsSelect as Component } from './es_fields_select';
import { fetch } from '../../../common/lib/fetch';
import chrome from 'ui/chrome';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}/api/canvas/es_fields`;

export const ESFieldsSelect = compose(
  withState('fields', 'setFields', []),
  lifecycle({
    componentDidMount() {
      const index = this.props.index || '_all';
      fetch.get(`${apiPath}?index=${index}`)
      .then(res => {
        this.props.setFields(Object.keys(res.data).sort());
      });
    },
  })
)(Component);
