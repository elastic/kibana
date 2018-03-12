import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { CallOuts } from './components/call_outs';
import { Table } from './components/table';

import { toEditableConfig } from './lib';

export class AdvancedSettingsTable extends Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      settings: this.mapConfig(this.props.config)
    };

    console.log('jen', this.state);
  }

  mapConfig(config) {
    const all = config.getAll();

    return Object.entries(all).map((setting) => {
      return toEditableConfig({
        def: setting[1],
        name: setting[0],
        value: setting[1].userValue,
        isCustom: config.isCustom(setting[0]),
      });
    }).filter((c) => !c.readonly);
  }

  render() {
    const { settings } = this.state;
    return (
      <div>
        <CallOuts/>
        <Table
          items={settings}
        />
      </div>
    );
  }
}
