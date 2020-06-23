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

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import classNames from 'classnames';
import hljs from 'highlight.js';

export class GuideCodeViewer extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    if (this.refs.html) {
      hljs.highlightBlock(this.refs.html);
    }

    if (this.refs.javascript) {
      hljs.highlightBlock(this.refs.javascript);
    }
  }

  renderSection(type, code) {
    const typeToCodeClassMap = {
      JavaScript: 'javascript',
      HTML: 'html',
    };

    const codeClass = typeToCodeClassMap[type];

    if (code) {
      return (
        <div className="guideCodeViewer__section" key={type}>
          <div className="guideCodeViewer__title">{type}</div>
          <pre className="guideCodeViewer__content">
            <code ref={codeClass} className={codeClass}>
              {code}
            </code>
          </pre>
        </div>
      );
    }
  }

  render() {
    const classes = classNames('guideCodeViewer', {
      'is-code-viewer-open': this.props.isOpen,
    });

    const codeSections = this.props.source.map((sourceObject) =>
      this.renderSection(sourceObject.type, sourceObject.code)
    );

    return (
      <div className={classes}>
        <div className="guideCodeViewer__header">{this.props.title}</div>

        <div className="guideCodeViewer__closeButton fa fa-times" onClick={this.props.onClose} />

        {codeSections}
      </div>
    );
  }
}

GuideCodeViewer.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.string,
  source: PropTypes.array,
};
