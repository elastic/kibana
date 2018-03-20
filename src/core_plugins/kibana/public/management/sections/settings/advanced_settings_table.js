import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';

import { CallOuts } from './components/call_outs';
import { Table } from './components/table';

import { toEditableConfig } from './lib';

import './advanced_settings_table.less';

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
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center">
            <EuiPageContentBody>
              <CallOuts/>
              <EuiSpacer size="s" />
              <Table
                items={settings}
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
