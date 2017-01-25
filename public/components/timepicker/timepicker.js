import React from 'react';
import {TimepickerConfig} from '@elastic/kbn-react-ui';
import toTimerange from 'plugins/rework/lib/to_timerange';

export default React.createClass({
  render() {
    const {time, onChange} = this.props;

    const app = {
      timefilter: time,
      timerange: toTimerange(time.from, time.to)
    };

    return (
      <TimepickerConfig
        app={app}
        onChange={onChange}>
      </TimepickerConfig>
    );
  }
});
