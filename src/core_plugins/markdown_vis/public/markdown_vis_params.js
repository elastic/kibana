import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiSwitch,
} from '@elastic/eui';

import { EditorOptionsGroup } from 'ui/vis/editors/components';

export class MarkdownOptionsTab extends Component {

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

    return (
      <EuiForm>
        <EditorOptionsGroup title="General">
          <EuiFormRow
            id="fontSize"
            label={`Font Size (${params.fontSize}pt)`}
          >
            <EuiRange
              min={8}
              max={36}
              value={params.fontSize.toString()}
              onChange={this.handleUpdate('fontSize')}
              data-test-subj="markdownEditorFontSize"
            />
          </EuiFormRow>

          <EuiFormRow
            id="openLinksInNewTab"
          >
            <EuiSwitch
              label="Open links in new tab"
              checked={params.openLinksInNewTab}
              onChange={this.handleUpdate('openLinksInNewTab', 'checked')}
              data-test-subj="markdownEditorOpenLinksInNewTab"
            />
          </EuiFormRow>
        </EditorOptionsGroup>
      </EuiForm>
    );
  }
}

MarkdownOptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
