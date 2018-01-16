import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
  KuiFieldGroup,
  KuiFieldGroupSection,
  KuiCheckBoxLabel } from 'ui_framework/components';

export class OptionsTab extends Component {

  setVisParam = (paramName, paramValue) => {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleUpdateFiltersChange = (evt) => {
    this.setVisParam('updateFiltersOnChange', evt.target.checked);
  }

  handleUseTimeFilter = (evt) => {
    this.setVisParam('useTimeFilter', evt.target.checked);
  }

  render() {
    return (
      <div>

        <div className="sidebar-item">
          <div className="vis-editor-agg-header">
            <KuiFieldGroup>
              <KuiFieldGroupSection>
                <KuiCheckBoxLabel
                  text="Update Kibana filters on each change"
                  isChecked={this.props.scope.vis.params.updateFiltersOnChange}
                  onChange={this.handleUpdateFiltersChange}
                  data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"
                />
              </KuiFieldGroupSection>
            </KuiFieldGroup>
          </div>

          <div className="vis-editor-agg-header">
            <KuiFieldGroup>
              <KuiFieldGroupSection>
                <KuiCheckBoxLabel
                  text="Use time filter"
                  isChecked={this.props.scope.vis.params.useTimeFilter}
                  onChange={this.handleUseTimeFilter}
                  data-test-subj="inputControlEditorUseTimeFilterCheckbox"
                />
              </KuiFieldGroupSection>
            </KuiFieldGroup>
          </div>
        </div>

      </div>
    );
  }
}

OptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
