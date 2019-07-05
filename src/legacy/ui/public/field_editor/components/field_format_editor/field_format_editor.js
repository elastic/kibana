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

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

export class FieldFormatEditor extends PureComponent {
  static propTypes = {
    fieldType: PropTypes.string.isRequired,
    fieldFormat: PropTypes.object.isRequired,
    fieldFormatId: PropTypes.string.isRequired,
    fieldFormatParams: PropTypes.object.isRequired,
    fieldFormatEditors: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      EditorComponent: null,
    };
  }

  static getDerivedStateFromProps(nextProps) {
    return {
      EditorComponent: nextProps.fieldFormatEditors.getEditor(nextProps.fieldFormatId) || null,
    };
  }

  render() {
    const { EditorComponent } = this.state;
    const { fieldType, fieldFormat, fieldFormatParams, onChange, onError } = this.props;

    return (
      <Fragment>
        { EditorComponent ? (
          <EditorComponent
            fieldType={fieldType}
            format={fieldFormat}
            formatParams={fieldFormatParams}
            onChange={onChange}
            onError={onError}
          />
        ) : null}
      </Fragment>
    );
  }
}
