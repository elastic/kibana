import React, { Component } from 'react';

import 'brace/mode/less';
import 'brace/theme/github';

import {
  KuiCodeEditor
} from '../../../../components';

export default class extends Component {
  state = {
    value: '<p>This code is read only</p>'
  };

  render() {
    return (
      <KuiCodeEditor
        mode="less"
        theme="github"
        width="100%"
        value={this.state.value}
        setOptions={{ fontSize: '14px' }}
        isReadOnly
      />
    );
  }
}
