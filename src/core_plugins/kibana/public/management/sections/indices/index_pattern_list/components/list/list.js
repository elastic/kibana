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
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiBadge,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

class ListUi extends Component {
  static propTypes = {
    indexPatterns: PropTypes.array,
    defaultIndex: PropTypes.string,
  }

  renderList() {
    const { indexPatterns, intl } = this.props;

    if (indexPatterns && indexPatterns.length) {
      return (
        <div>
          {
            indexPatterns.map(pattern => {
              const { id, default: isDefault, active, url, title, tag } = pattern;

              let icon;

              if (isDefault) {
                icon = (
                  <Fragment>
                    <em
                      aria-label={intl.formatMessage({
                        id: 'kbn.management.indexPatternList.defaultIndexPatternIconAriaLabel',
                        defaultMessage: 'Default index pattern',
                      })}
                      className="fa fa-star"
                    />
                    {' '}
                  </Fragment>
                );
              }

              let titleElement;

              if (active) {
                titleElement = <strong>{title}</strong>;
              } else {
                titleElement = title;
              }

              let tagElement;

              if (tag) {
                const { key, color, name } = tag;

                tagElement = (
                  <Fragment key={key}>
                    {' '}
                    <EuiBadge color={color || 'primary'}>{name}</EuiBadge>
                  </Fragment>
                );
              }

              return (
                <div key={id}>
                  <EuiButtonEmpty size="xs" href={url} data-test-subj="indexPatternLink">
                    {icon}
                    {titleElement}
                    {tagElement}
                  </EuiButtonEmpty>
                  <EuiSpacer size="xs"/>
                </div>
              );
            })
          }
        </div>
      );
    }

    return null;
  }

  renderNoDefaultMessage() {
    const { defaultIndex } = this.props;
    return !defaultIndex ? (
      <div className="indexPatternList__headerWrapper">
        <EuiCallOut
          color="warning"
          size="s"
          iconType="alert"
          title={(
            <FormattedMessage
              id="kbn.management.indexPatternList.noDefaultIndexPatternTitle"
              defaultMessage="No default index pattern. You must select or create one to continue."
            />
          )}
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

export const List = injectI18n(ListUi);
