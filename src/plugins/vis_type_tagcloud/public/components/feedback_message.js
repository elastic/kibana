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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIconTip } from '@elastic/eui';

export class FeedbackMessage extends Component {
  constructor() {
    super();
    this.state = { shouldShowTruncate: false, shouldShowIncomplete: false };
  }

  render() {
    if (!this.state.shouldShowTruncate && !this.state.shouldShowIncomplete) {
      return '';
    }

    return (
      <EuiIconTip
        type="alert"
        color="warning"
        content={
          <Fragment>
            {this.state.shouldShowTruncate && (
              <p>
                <FormattedMessage
                  id="visTypeTagCloud.feedbackMessage.truncatedTagsDescription"
                  defaultMessage="The number of tags has been truncated to avoid long draw times."
                />
              </p>
            )}
            {this.state.shouldShowIncomplete && (
              <p>
                <FormattedMessage
                  id="visTypeTagCloud.feedbackMessage.tooSmallContainerDescription"
                  defaultMessage="The container is too small to display the entire cloud. Tags might be cropped or omitted."
                />
              </p>
            )}
          </Fragment>
        }
      />
    );
  }
}
