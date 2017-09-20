import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { KuiFieldGroup, KuiFieldGroupSection } from 'ui_framework/components';

export class OptionsTab extends Component {
  constructor(props) {
    super(props);

    this.handleUpdateFiltersChange = this.handleUpdateFiltersChange.bind(this);
  }

  setVisParam(paramName, paramValue) {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleUpdateFiltersChange(evt) {
    this.setVisParam('updateFiltersOnChange', evt.target.checked);
  }

  render() {
    return (
      <div>

        <div className="sidebar-item">
          <div className="vis-editor-agg-header">
            <KuiFieldGroup>
              <KuiFieldGroupSection>
                <label>
                  <input
                    className="kuiCheckBox"
                    type="checkbox"
                    checked={this.props.scope.vis.params.updateFiltersOnChange}
                    onChange={this.handleUpdateFiltersChange}
                    data-test-subj="inputControlEditorUpdateFiltersOnChangeCheckbox"
                  />
                  Update kibana filters on each change
                </label>
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
