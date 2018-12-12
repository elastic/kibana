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
import { FormattedMessage } from '@kbn/i18n/react';

export class FeedbackMessage extends Component {

  constructor() {
    super();
    this.state = { shouldShowTruncate: false, shouldShowIncomplete: false };
  }

  render() {
    return (
      <div className="tgcVisFeedback" >
        <div className="tgcVisFeedback__message" style={{ display: this.state.shouldShowTruncate ? 'block' : 'none' }}>
          <FormattedMessage
            id="tagCloud.feedbackMessage.truncatedTagsDescription"
            defaultMessage="The number of tags has been truncated to avoid long draw times."
          />
        </div>
        <div className="tgcVisFeedback__message" style={{ display: this.state.shouldShowIncomplete ? 'block' : 'none' }}>
          <FormattedMessage
            id="tagCloud.feedbackMessage.tooSmallContainerDescription"
            defaultMessage="The container is too small to display the entire cloud. Tags might be cropped or omitted."
          />
        </div>
      </div>
    );
  }
}
