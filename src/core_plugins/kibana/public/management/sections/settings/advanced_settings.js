import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  Comparators,
  EuiPanel,
} from '@elastic/eui';

import { CallOuts } from './components/call_outs';
import { Form } from './components/form';

import { toEditableConfig } from './lib';

import './advanced_settings.less';

export class AdvancedSettings extends Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    query: PropTypes.string,
  }

  constructor(props) {
    super(props);
    const { config } = this.props;

    this.state = {
      settings: this.mapConfig(config)
    };
  }

  componentWillReceiveProps(nextProps) {
    const { config } = nextProps;
    this.setState({
      settings: this.mapConfig(config)
    });
  }

  mapConfig(config) {
    const all = config.getAll();
    return Object.entries(all)
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

  saveConfig = (name, value) => {
    return this.props.config.set(name, value);
  }

  clearConfig = (name) => {
    return this.props.config.remove(name);
  }

  render() {
    const { settings } = this.state;
    const { query } = this.props;

    return (
      <div className="advancedSettings">
        <CallOuts/>
        <Form
          settings={settings}
          save={this.saveConfig}
          clear={this.clearConfig}
          query={query}
        />
      </div>
    );
  }
}
