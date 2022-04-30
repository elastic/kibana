/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPortal, // EuiPortal is a temporary requirement to use EuiFlyout with "ownFocus"
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { loadingSpinner } from './loading_spinner';

interface Props {
  fetchExample: () => Promise<unknown[]>;
  onClose: () => void;
}

interface State {
  isLoading: boolean;
  hasPrivilegeToRead: boolean;
  data: unknown[] | null;
}

/**
 * React component for displaying the example data associated with the Telemetry opt-in banner.
 */
export class OptInExampleFlyout extends React.PureComponent<Props, State> {
  _isMounted = false;

  public readonly state: State = {
    data: null,
    isLoading: true,
    hasPrivilegeToRead: false,
  };

  async componentDidMount() {
    this._isMounted = true;

    try {
      const { fetchExample } = this.props;
      const clusters = await fetchExample();
      if (this._isMounted) {
        this.setState({
          data: Array.isArray(clusters) ? clusters : null,
          isLoading: false,
          hasPrivilegeToRead: true,
        });
      }
    } catch (err) {
      this.setState({
        isLoading: false,
        hasPrivilegeToRead: err.status !== 403,
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  renderBody({ data, isLoading, hasPrivilegeToRead }: State) {
    if (isLoading) {
      return loadingSpinner;
    }

    if (!hasPrivilegeToRead) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="telemetry.callout.errorUnprivilegedUserTitle"
              defaultMessage="Error displaying cluster statistics"
            />
          }
          color="danger"
          iconType="cross"
        >
          <FormattedMessage
            id="telemetry.callout.errorUnprivilegedUserDescription"
            defaultMessage="You do not have access to see unencrypted cluster statistics."
          />
        </EuiCallOut>
      );
    }

    if (data === null) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="telemetry.callout.errorLoadingClusterStatisticsTitle"
              defaultMessage="Error loading cluster statistics"
            />
          }
          color="danger"
          iconType="cross"
        >
          <FormattedMessage
            id="telemetry.callout.errorLoadingClusterStatisticsDescription"
            defaultMessage="An unexpected error occured while attempting to fetch the cluster statistics.
              This can occur because Elasticsearch failed, Kibana failed, or there is a network error.
              Check Kibana, then reload the page and try again."
          />
        </EuiCallOut>
      );
    }

    return <EuiCodeBlock language="js">{JSON.stringify(data, null, 2)}</EuiCodeBlock>;
  }

  render() {
    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={this.props.onClose} maxWidth={true}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="telemetry.callout.clusterStatisticsTitle"
                  defaultMessage="Cluster statistics"
                />
              </h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText>
                <FormattedMessage
                  id="telemetry.callout.clusterStatisticsDescription"
                  defaultMessage="This is an example of the basic cluster statistics that we'll collect.
                  It includes the number of indices, shards, and nodes.
                  It also includes high-level usage statistics, such as whether monitoring is turned on."
                />
              </EuiText>
            </EuiTextColor>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>{this.renderBody(this.state)}</EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
