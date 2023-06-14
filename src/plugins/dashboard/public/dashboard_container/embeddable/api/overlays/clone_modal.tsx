/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiCallOut,
  EuiFormRow,
} from '@elastic/eui';

interface Props {
  onClone: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<void>;
  onClose: () => void;
  title: string;
}

interface State {
  newDashboardName: string;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
}

const cloneDashboardModalTitle = (
  <FormattedMessage
    id="dashboard.topNav.cloneModal.confirmCloneDescription"
    defaultMessage="Clone dashboard"
  />
);
const cloneDashboardConfirmButtonLabel = (
  <FormattedMessage id="dashboard.topNav.cloneModal.cloneButtonLabel" defaultMessage="Clone" />
);

export class DashboardCloneModal extends React.Component<Props, State> {
  private isMounted = false;

  constructor(props: Props) {
    super(props);

    this.state = {
      newDashboardName: props.title,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
      isLoading: false,
    };
  }
  componentDidMount() {
    this.isMounted = true;
  }

  componentWillUnmount() {
    this.isMounted = false;
  }

  onTitleDuplicate = () => {
    this.setState({
      isTitleDuplicateConfirmed: true,
      hasTitleDuplicate: true,
    });
  };

  cloneDashboard = async () => {
    this.setState({
      isLoading: true,
    });

    await this.props.onClone(
      this.state.newDashboardName,
      this.state.isTitleDuplicateConfirmed,
      this.onTitleDuplicate
    );

    if (this.isMounted) {
      this.setState({
        isLoading: false,
      });
    }
  };

  onInputChange = (event: any) => {
    this.setState({
      newDashboardName: event.target.value,
      isTitleDuplicateConfirmed: false,
      hasTitleDuplicate: false,
    });
  };

  renderDuplicateTitleCallout = () => {
    if (!this.state.hasTitleDuplicate) {
      return;
    }

    return (
      <Fragment>
        <EuiSpacer />
        <EuiCallOut
          size="s"
          title={i18n.translate('dashboard.topNav.cloneModal.dashboardExistsTitle', {
            defaultMessage: 'A dashboard with the title {newDashboardName} already exists.',
            values: {
              newDashboardName: `'${this.state.newDashboardName}'`,
            },
          })}
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            <FormattedMessage
              id="dashboard.topNav.cloneModal.dashboardExistsDescription"
              defaultMessage="Click {confirmClone} to clone the dashboard with the duplicate title."
              values={{
                confirmClone: <strong>{cloneDashboardConfirmButtonLabel}</strong>,
              }}
            />
          </p>
        </EuiCallOut>
      </Fragment>
    );
  };

  render() {
    return (
      <EuiModal
        data-test-subj="dashboardCloneModal"
        className="dshCloneModal"
        onClose={this.props.onClose}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>{cloneDashboardModalTitle}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow
            label={i18n.translate('dashboard.cloneModal.cloneDashboardModalTitleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              autoFocus
              aria-label={i18n.translate('dashboard.cloneModal.cloneDashboardModalTitleAriaLabel', {
                defaultMessage: 'Cloned Dashboard Title',
              })}
              data-test-subj="clonedDashboardTitle"
              value={this.state.newDashboardName}
              onChange={this.onInputChange}
              isInvalid={this.state.hasTitleDuplicate}
            />
          </EuiFormRow>

          {this.renderDuplicateTitleCallout()}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cloneCancelButton" onClick={this.props.onClose}>
            <FormattedMessage
              id="dashboard.topNav.cloneModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            fill
            data-test-subj="cloneConfirmButton"
            onClick={this.cloneDashboard}
            isLoading={this.state.isLoading}
          >
            {cloneDashboardConfirmButtonLabel}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
}
