/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export class SomeComponent extends React.Component {
  someFn() {
    const message = this.props.intl.formatMessage(
      {
        id: 'home.tutorial.unexpectedStatusCheckStateErrorDescription',
        defaultMessage: 'Unexpected status check state {statusCheckState}',
      },
      {
        statusCheckState: 123,
      }
    );
  }
  anotherFn() {
    const { intl } = this.props;

    const anotherMsg = intl.formatMessage({
      id: 'message_with_no_values',
      defaultMessage: 'Pipeline batch delay',
    });
  }

  render() {
    const { intl } = this.props;
    return (
      <div
        aria-label={intl.formatMessage({
          id: 'messsage_inside_component',
          defaultMessage: 'Pipeline batch delay',
        })}
      >
        Hello
      </div>
    );
  }
}
