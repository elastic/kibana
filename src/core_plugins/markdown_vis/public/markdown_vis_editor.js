import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiTextArea,
} from '@elastic/eui';

import { EditorOptionsGroup } from 'ui/vis/editors/components';

export class MarkdownEditorTab extends Component {

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
      <EuiLink href="https://www.markdownguide.org/cheat-sheet" target="_blank">
        <EuiIcon type="help" /> Syntax help
      </EuiLink>
    );

    return (
      <EuiForm>
        <EditorOptionsGroup
          title="Markdown"
          actions={markdownLabel}
          collapsible={false}
          grow={true}
          className="markdown-vis-editor"
        >
          <EuiFormRow
            id="markdown"
            fullWidth={true}
            className="markdown-vis-editor-row"
          >
            <EuiTextArea
              value={params.markdown}
              fullWidth={true}
              onChange={this.handleUpdate('markdown')}
              data-test-subj="markdownEditorMarkdown"
              className="markdown-vis-editor-textarea"
            />
          </EuiFormRow>
        </EditorOptionsGroup>
      </EuiForm>
    );
  }
}

MarkdownEditorTab.propTypes = {
  scope: PropTypes.object.isRequired,
  stageEditorParams: PropTypes.func.isRequired
};
