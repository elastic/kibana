/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';

interface Props {
  useMargins: boolean;
  onUseMarginsChange: (useMargins: boolean) => void;
  hidePanelTitles: boolean;
  onHidePanelTitlesChange: (hideTitles: boolean) => void;
  syncColors: boolean;
  onSyncColorsChange: (syncColors: boolean) => void;
  syncTooltips: boolean;
  onSyncTooltipsChange: (syncTooltips: boolean) => void;
}

interface State {
  useMargins: boolean;
  hidePanelTitles: boolean;
  syncColors: boolean;
  syncTooltips: boolean;
}

export class OptionsMenu extends Component<Props, State> {
  state = {
    useMargins: this.props.useMargins,
    hidePanelTitles: this.props.hidePanelTitles,
    syncColors: this.props.syncColors,
    syncTooltips: this.props.syncTooltips,
  };

  constructor(props: Props) {
    super(props);
  }

  handleUseMarginsChange = (evt: any) => {
    const isChecked = evt.target.checked;
    this.props.onUseMarginsChange(isChecked);
    this.setState({ useMargins: isChecked });
  };

  handleHidePanelTitlesChange = (evt: any) => {
    const isChecked = !evt.target.checked;
    this.props.onHidePanelTitlesChange(isChecked);
    this.setState({ hidePanelTitles: isChecked });
  };

  handleSyncColorsChange = (evt: any) => {
    const isChecked = evt.target.checked;
    this.props.onSyncColorsChange(isChecked);
    this.setState({ syncColors: isChecked });
  };

  handleSyncTooltipsChange = (evt: any) => {
    const isChecked = evt.target.checked;
    this.props.onSyncTooltipsChange(isChecked);
    this.setState({ syncTooltips: isChecked });
  };

  render() {
    return (
      <EuiForm data-test-subj="dashboardOptionsMenu">
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('dashboard.topNav.options.useMarginsBetweenPanelsSwitchLabel', {
              defaultMessage: 'Use margins between panels',
            })}
            checked={this.state.useMargins}
            onChange={this.handleUseMarginsChange}
            data-test-subj="dashboardMarginsCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('dashboard.topNav.options.hideAllPanelTitlesSwitchLabel', {
              defaultMessage: 'Show panel titles',
            })}
            checked={!this.state.hidePanelTitles}
            onChange={this.handleHidePanelTitlesChange}
            data-test-subj="dashboardPanelTitlesCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('dashboard.topNav.options.syncColorsBetweenPanelsSwitchLabel', {
              defaultMessage: 'Sync color palettes across panels',
            })}
            checked={this.state.syncColors}
            onChange={this.handleSyncColorsChange}
            data-test-subj="dashboardSyncColorsCheckbox"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('dashboard.topNav.options.syncTooltipsBetweenPanelsSwitchLabel', {
              defaultMessage: 'Sync tooltips across panels',
            })}
            checked={this.state.syncTooltips}
            onChange={this.handleSyncTooltipsChange}
            data-test-subj="dashboardSyncTooltipsCheckbox"
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
}
