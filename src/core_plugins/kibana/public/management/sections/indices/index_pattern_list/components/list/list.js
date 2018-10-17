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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiBadge,
  EuiCallOut,
} from '@elastic/eui';

export class List extends Component {
  static propTypes = {
    indexPatterns: PropTypes.array,
    defaultIndex: PropTypes.string,
  }

  renderList() {
    const { indexPatterns } = this.props;
    return indexPatterns && indexPatterns.length ? (
      <div>
        {
          indexPatterns.map(pattern => {
            return (
              <div key={pattern.id} >
                <EuiButtonEmpty size="s" href={pattern.url} data-test-subj="indexPatternLink">
                  {pattern.default ? <Fragment><i aria-label="Default index pattern" className="fa fa-star" /> </Fragment> : ''}
                  {pattern.active ? <strong>{pattern.title}</strong> : pattern.title} {pattern.tag ? (
                    <Fragment key={pattern.tag.key}>
                      {<EuiBadge color={pattern.tag.color || 'primary'}>{pattern.tag.name}</EuiBadge> }
                    </Fragment>
                  ) : null}
                </EuiButtonEmpty>
              </div>
            );
          })
        }
      </div>
    ) : null;
  }

  renderNoDefaultMessage() {
    const { defaultIndex } = this.props;
    return !defaultIndex ? (
      <div className="indexPatternList__headerWrapper">
        <EuiCallOut
          color="warning"
          size="s"
          iconType="alert"
          title="No default index pattern. You must select or create one to continue."
        />
      </div>
    ) : null;
  }

  render() {
    return (
      <div>
        {this.renderNoDefaultMessage()}
        {this.renderList()}
      </div>
    );
  }
}
