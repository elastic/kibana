import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

export class PieOptionsTab extends Component {

  setVisParam = (paramName, paramValue) => {
    const params = _.cloneDeep(this.props.scope.vis.params);
    _.set(params, paramName, paramValue);
    this.props.stageEditorParams(params);
  };

  handleUpdate = (name, prop = 'value') => {
    return (evt) => {
      this.setVisParam(name, evt.target[prop]);
    };
  };

  render() {
    const params = this.props.scope.vis.params;
    const collections = this.props.scope.vis.type.editorConfig.collections;

    return (
      <EuiForm>

        <EuiPanel grow={false}>
          <EuiTitle size="s"><span>Pie settings</span></EuiTitle>

          <EuiSpacer />

          <EuiFormRow
            id="isDonut"
          >
            <EuiSwitch
              label="Donut"
              checked={params.isDonut}
              onChange={this.handleUpdate('isDonut', 'checked')}
              data-test-subj="pieEditorIsDonut"
            />
          </EuiFormRow>

          <EuiFormRow
            id="addTooltip"
          >
            <EuiSwitch
              label="Show tooltip per slice"
              checked={params.addTooltip}
              onChange={this.handleUpdate('addTootip', 'checked')}
              data-test-subj="pieEditorShowTooltip"
            />
          </EuiFormRow>

          <EuiFormRow
            id="legendPosition"
            label="Legend position"
          >
            <EuiSelect
              options={collections.legendPositions}
              value={params.legendPosition}
              onChange={this.handleUpdate('legendPosition')}
              data-test-subj="pieEditorLegendPosition"
            />
          </EuiFormRow>

        </EuiPanel>

        <EuiPanel grow={false}>

          <EuiTitle size="s"><span>Label settings</span></EuiTitle>

          <EuiSpacer />

          <EuiFormRow
            id="showLabels"
          >
            <EuiSwitch
              label="Show labels"
              checked={params.labels.show}
              onChange={this.handleUpdate('labels.show', 'checked')}
              data-test-subj="pieEditorShowLabels"
            />
          </EuiFormRow>

          <EuiFormRow
            id="showLastLevel"
          >
            <EuiSwitch
              label="Show top level only"
              checked={params.labels.last_level}
              disabled={!params.labels.show}
              onChange={this.handleUpdate('labels.last_level', 'checked')}
              data-test-subj="pieEditorShowLastLevel"
            />
          </EuiFormRow>

          <EuiFormRow
            id="showValues"
          >
            <EuiSwitch
              label="Show values"
              checked={params.labels.values}
              disabled={!params.labels.show}
              onChange={this.handleUpdate('labels.values', 'checked')}
              data-test-subj="pieEditorShowValues"
            />
          </EuiFormRow>

          <EuiFormRow
            id="truncateLabels"
            label="Truncation limit"
          >
            <EuiFieldNumber
              value={params.labels.truncate}
              disabled={!params.labels.show}
              onChange={this.handleUpdate('labels.truncate')}
              data-test-subj="pieEditorTruncateLabels"
            />
          </EuiFormRow>

        </EuiPanel>
      </EuiForm>
    );
  }
}

PieOptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
