import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';

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
        <EuiSpacer />
        <EuiFormRow
          id="fontSize"
          label={`Font Size (${params.fontSize}pt)`}
        >
          <EuiRange
            checked={params.fontSize}
            min="8"
            max="36"
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

        <EuiFormRow
          id="markdown"
          label="Markdown"
          fullWidth={true}
        >
          <EuiTextArea
            value={params.markdown}
            fullWidth={true}
            rows="20"
            onChange={this.handleUpdate('markdown')}
            data-test-subj="markdownEditorMarkdown"
          />
        </EuiFormRow>

      </EuiForm>
    );
  }
}

MarkdownOptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
