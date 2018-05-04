import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
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

    const markdownLabel = (
      <EuiFlexGroup>
        <EuiFlexItem>
          Content
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink className="markdown-vis--help" href="https://www.markdownguide.org/cheat-sheet" target="_blank">
            <EuiIcon type="help" /> Syntax help
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    return (
      <EuiForm>

        <EuiPanel className="markdown-vis-options">
          <EuiTitle className="markdown-vis--title"><h1>Markdown</h1></EuiTitle>
          <EuiSpacer />

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

          <EuiFormRow
            id="markdown"
            label={markdownLabel}
            fullWidth={true}
            className="markdown-vis--editor"
          >
            <EuiTextArea
              value={params.markdown}
              fullWidth={true}
              onChange={this.handleUpdate('markdown')}
              data-test-subj="markdownEditorMarkdown"
            />
          </EuiFormRow>
        </EuiPanel>
      </EuiForm>
    );
  }
}

MarkdownOptionsTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
