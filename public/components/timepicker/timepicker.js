import React from 'react';
import {TimepickerConfig} from '@elastic/kbn-react-ui';
import toTimerange from 'plugins/rework/lib/to_timerange';
import moment from 'moment';
import _ from 'lodash';
import '@elastic/kbn-react-ui/src/less/main.less';

export default React.createClass({
  clean(time) {
    const from = _.isNumber(time.from) ? moment(time.from).toISOString() : time.from;
    const to = _.isNumber(time.to) ? moment(time.to).toISOString() : time.to;
    this.props.onChange({...time, to: to, from: from});
  },
  render() {
    const {time, onChange} = this.props;

    const app = {
      timefilter: time,
      timerange: toTimerange(time.from, time.to)
    };

    return (
      <TimepickerConfig
        app={app}
        onChange={this.clean}>
      </TimepickerConfig>
    );
  }
});
