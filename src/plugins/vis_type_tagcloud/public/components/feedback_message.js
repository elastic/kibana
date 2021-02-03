/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
