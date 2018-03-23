import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSpacer,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  Comparators,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { CallOuts } from './components/call_outs';
import { Form } from './components/form';

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
    console.log(Comparators);
  }

  mapConfig(config) {
    const all = config.getAll();

    return  Object.entries(all)
      .map((setting) => {
        return toEditableConfig({
          def: setting[1],
          name: setting[0],
          value: setting[1].userValue,
          isCustom: config.isCustom(setting[0]),
        });
      })
      .filter((c) => !c.readonly)
      .sort(Comparators.property('name', Comparators.default('asc')));
  }


  // setup loading flag, run async op, then clear loading and editing flag (just in case)
  // const loading = loadingfunction (conf, fn) {
  //   conf.loading = true;
  //   fn()
  //     .then(function () {
  //       conf.loading = conf.editing = false;
  //     })
  //     .catch(fatalError);
  // };

  saveConfig(name, value) {
    this.config.set(name, value);
  }

  clearConfig(name) {
    this.config.remove(name);
  }

  render() {
    const { settings } = this.state;
    return (
      <div className="advancedSettings">
        <EuiFlexGroup>
          <EuiFlexItem>
            <CallOuts/>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <Form
              settings={settings}
              save={this.saveConfig}
              clear={this.clearConfig}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
