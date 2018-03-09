import React, { Component } from 'react';

import { CallOuts } from './components/call_outs';
import { Table } from './components/table';

export class AdvancedSettingsTable extends Component {
  render() {
    return (
      <div>
        <CallOuts/>
        <Table/>
      </div>
    );
  }
}
