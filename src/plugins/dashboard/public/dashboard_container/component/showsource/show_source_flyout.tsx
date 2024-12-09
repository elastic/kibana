/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiForm,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import type { DashboardContainer } from '../../embeddable/dashboard_container';

interface Props {
  onClose: () => void;
  dashboardApi: DashboardContainer;
}

interface State {}

export class ShowSourceFlyout extends React.Component<Props, State> {
  private _isMounted = false;
  state: State = {};

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const dashboardCode = 'Should get dashboard-json here from props.dashboardApi object';

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="dashboard.embeddableApi.showSource.flyout.title"
                defaultMessage="Show Source"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{dashboardCode}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="left"
                data-test-subj="cancelShowSourceButton"
                onClick={this.props.onClose}
              >
                <FormattedMessage
                  id="dashboard.embeddableApi.showSource.flyout.cancelButtonTitle"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </>
    );
  }
}
