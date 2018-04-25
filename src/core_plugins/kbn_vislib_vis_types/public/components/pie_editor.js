import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiAccordion,
  EuiFieldNumber,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
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
            label="Show Tooltip"
            checked={params.addTooltip}
            onChange={this.handleUpdate('addTootip', 'checked')}
            data-test-subj="pieEditorShowTooltip"
          />
        </EuiFormRow>

        <EuiFormRow
          id="legendPosition"
          label="Legend Position"
        >
          <EuiSelect
            options={collections.legendPositions}
            value={params.legendPosition}
            onChange={this.handleUpdate('legendPosition')}
            data-test-subj="pieEditorLegendPosition"
          />
        </EuiFormRow>

        <EuiAccordion buttonContent="Labels Settings">
          <EuiSpacer />

          <EuiFormRow
            id="showLabels"
          >
            <EuiSwitch
              label="Show Labels"
              checked={params.labels.show}
              onChange={this.handleUpdate('labels.show', 'checked')}
              data-test-subj="pieEditorShowLabels"
            />
          </EuiFormRow>

          <EuiFormRow
            id="showLastLevel"
          >
            <EuiSwitch
              label="Show Top Level Only"
              checked={params.labels.last_level}
              onChange={this.handleUpdate('labels.last_level', 'checked')}
              data-test-subj="pieEditorShowLastLevel"
            />
          </EuiFormRow>

          <EuiFormRow
            id="showValues"
          >
            <EuiSwitch
              label="Show Values"
              checked={params.labels.values}
              onChange={this.handleUpdate('labels.values', 'checked')}
              data-test-subj="pieEditorShowValues"
            />
          </EuiFormRow>

          <EuiFormRow
            id="truncateLabels"
            label="Truncate"
          >
            <EuiFieldNumber
              value={params.labels.truncate}
              onChange={this.handleUpdate('labels.truncate')}
              data-test-subj="pieEditorTruncateLabels"
            />
          </EuiFormRow>
        </EuiAccordion>
      </EuiForm>
    );
  }
}

PieOptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
