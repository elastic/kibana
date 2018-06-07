/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import AceEditor from 'react-ace';

import { htmlIdGenerator, keyCodes } from '../../services';

export class KuiCodeEditor extends Component {
  state = {
    isHintActive: true,
    isEditing: false,
  };

  idGenerator = htmlIdGenerator();

  aceEditorRef = (aceEditor) => {
    if (aceEditor) {
      this.aceEditor = aceEditor;
      aceEditor.editor.textInput.getElement().tabIndex = -1;
      aceEditor.editor.textInput.getElement().addEventListener('keydown', this.onKeydownAce);
    }
  };

  onKeydownAce = (ev) => {
    if (ev.keyCode === keyCodes.ESCAPE) {
      ev.preventDefault();
      ev.stopPropagation();
      this.stopEditing();
      this.editorHint.focus();
    }
  }

  onFocusAce = (...args) => {
    this.setState({
      isEditing: true,
    });
    if (this.props.onFocus) {
      this.props.onFocus(...args);
    }
  }

  onBlurAce = (...args) => {
    this.stopEditing();
    if (this.props.onBlur) {
      this.props.onBlur(...args);
    }
  };

  onKeyDownHint = (ev) => {
    if (ev.keyCode === keyCodes.ENTER) {
      ev.preventDefault();
      this.startEditing();
    }
  };

  startEditing = () => {
    this.setState({
      isHintActive: false,
    });
    this.aceEditor.editor.textInput.focus();
  }

  stopEditing() {
    this.setState({
      isHintActive: true,
      isEditing: false,
    });
  }

  render() {
    const {
      width,
      height,
      onBlur, // eslint-disable-line no-unused-vars
      isReadOnly,
      setOptions,
      cursorStart,
      ...rest
    } = this.props;

    const classes = classNames('kuiCodeEditorWrapper', {
      'kuiCodeEditorWrapper-isEditing': this.state.isEditing,
    });

    const promptClasses = classNames('kuiCodeEditorKeyboardHint', {
      'kuiCodeEditorKeyboardHint-isInactive': !this.state.isHintActive
    });

    let filteredCursorStart;

    const options = { ...setOptions };

    if (isReadOnly) {
      // Put the cursor at the beginning of the editor, so that it doesn't look like
      // a prompt to begin typing.
      filteredCursorStart = -1;

      Object.assign(options, {
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false,
      });
    } else {
      filteredCursorStart = cursorStart;
    }

    const activity =
      isReadOnly
        ? 'interacting with the code'
        : 'editing';

    const prompt = (
      <div
        className={promptClasses}
        id={this.idGenerator('codeEditor')}
        ref={(hint) => { this.editorHint = hint; }}
        tabIndex="0"
        role="button"
        onClick={this.startEditing}
        onKeyDown={this.onKeyDownHint}
        data-test-subj="codeEditorHint"
      >
        <p className="kuiText kuiVerticalRhythmSmall">
          Press Enter to start {activity}.
        </p>

        <p className="kuiText kuiVerticalRhythmSmall">
          When you&rsquo;re done, press Escape to stop {activity}.
        </p>
      </div>
    );

    return (
      <div
        className={classes}
        style={{ width, height }}
      >
        {prompt}

        <AceEditor
          ref={this.aceEditorRef}
          width={width}
          height={height}
          onFocus={this.onFocusAce}
          onBlur={this.onBlurAce}
          setOptions={options}
          cursorStart={filteredCursorStart}
          {...rest}
        />
      </div>
    );
  }
}

KuiCodeEditor.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  onBlur: PropTypes.func,
  isReadOnly: PropTypes.bool,
  setOptions: PropTypes.object,
  cursorStart: PropTypes.number,
};

KuiCodeEditor.defaultProps = {
  setOptions: {},
};
