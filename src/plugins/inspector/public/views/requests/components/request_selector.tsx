/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';

import { RequestStatus } from '../../../../common/adapters';
import { Request } from '../../../../common/adapters/request/types';

interface RequestSelectorProps {
  requests: Request[];
  selectedRequest: Request;
  onRequestChanged: (request: Request) => void;
}

export class RequestSelector extends Component<RequestSelectorProps> {
  static propTypes = {
    requests: PropTypes.array.isRequired,
    selectedRequest: PropTypes.object.isRequired,
    onRequestChanged: PropTypes.func,
  };

  handleSelected = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const selectedOption = this.props.requests.find(
      (request) => request.id === selectedOptions[0].value
    );

    if (selectedOption) {
      this.props.onRequestChanged(selectedOption);
    }
  };

  renderRequestCombobox() {
    const options = this.props.requests.map((item) => {
      const hasFailed = item.status === RequestStatus.ERROR;
      const testLabel = item.name.replace(/\s+/, '_');

      return {
        'data-test-subj': `inspectorRequestChooser${testLabel}`,
        label: hasFailed
          ? `${item.name} ${i18n.translate('inspector.requests.failedLabel', {
              defaultMessage: ' (failed)',
            })}`
          : item.name,
        value: item.id,
      };
    });

    return (
      <EuiComboBox
        data-test-subj="inspectorRequestChooser"
        fullWidth={true}
        id="inspectorRequestChooser"
        isClearable={false}
        onChange={this.handleSelected}
        options={options}
        prepend="Request"
        selectedOptions={[
          {
            label: this.props.selectedRequest.name,
            value: this.props.selectedRequest.id,
          },
        ]}
        singleSelection={{ asPlainText: true }}
      />
    );
  }

  render() {
    const { selectedRequest, requests } = this.props;

    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>{requests.length && this.renderRequestCombobox()}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {selectedRequest.status !== RequestStatus.PENDING && (
            <EuiToolTip
              position="left"
              title={
                selectedRequest.status === RequestStatus.OK ? (
                  <FormattedMessage
                    id="inspector.requests.requestSucceededTooltipTitle"
                    defaultMessage="Request succeeded"
                  />
                ) : (
                  <FormattedMessage
                    id="inspector.requests.requestFailedTooltipTitle"
                    defaultMessage="Request failed"
                  />
                )
              }
              content={
                <FormattedMessage
                  id="inspector.requests.requestTooltipDescription"
                  defaultMessage="The total time the request took."
                />
              }
            >
              <EuiBadge
                color={selectedRequest.status === RequestStatus.OK ? 'success' : 'danger'}
                iconType={selectedRequest.status === RequestStatus.OK ? 'check' : 'cross'}
              >
                <FormattedMessage
                  id="inspector.requests.requestTimeLabel"
                  defaultMessage="{requestTime}ms"
                  values={{ requestTime: selectedRequest.time }}
                />
              </EuiBadge>
            </EuiToolTip>
          )}
          {selectedRequest.status === RequestStatus.PENDING && (
            <EuiLoadingSpinner
              size="m"
              aria-label={i18n.translate('inspector.requests.requestInProgressAriaLabel', {
                defaultMessage: 'Request in progress',
              })}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
