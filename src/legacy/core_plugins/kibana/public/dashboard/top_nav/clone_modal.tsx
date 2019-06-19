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

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

interface Props {
  onClone: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<void>;
  onClose: () => void;
  title: string;
  intl: InjectedIntl;
}

interface State {
  newDashboardName: string;
  isTitleDuplicateConfirmed: boolean;
  hasTitleDuplicate: boolean;
  isLoading: boolean;
}

class DashboardCloneModalUi extends React.Component<Props, State> {
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
          title={this.props.intl.formatMessage(
            {
              id: 'kbn.dashboard.topNav.cloneModal.dashboardExistsTitle',
              defaultMessage: 'A dashboard with the title {newDashboardName} already exists.',
            },
            {
              newDashboardName: `'${this.state.newDashboardName}'`,
            }
          )}
          color="warning"
          data-test-subj="titleDupicateWarnMsg"
        >
          <p>
            <FormattedMessage
              id="kbn.dashboard.topNav.cloneModal.dashboardExistsDescription"
              defaultMessage="Click {confirmClone} to clone the dashboard with the duplicate title."
              values={{
                confirmClone: (
                  <strong>
                    <FormattedMessage
                      id="kbn.dashboard.topNav.cloneModal.confirmCloneDescription"
                      defaultMessage="Confirm Clone"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiCallOut>
      </Fragment>
    );
  };

  render() {
    return (
      <EuiOverlayMask>
        <EuiModal
          data-test-subj="dashboardCloneModal"
          className="dshCloneModal"
          onClose={this.props.onClose}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="kbn.dashboard.topNav.cloneModal.cloneDashboardModalHeaderTitle"
                defaultMessage="Clone dashboard"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>
                <FormattedMessage
                  id="kbn.dashboard.topNav.cloneModal.enterNewNameForDashboardDescription"
                  defaultMessage="Please enter a new name for your dashboard."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiFieldText
              autoFocus
              data-test-subj="clonedDashboardTitle"
              value={this.state.newDashboardName}
              onChange={this.onInputChange}
              isInvalid={this.state.hasTitleDuplicate}
            />

            {this.renderDuplicateTitleCallout()}
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty data-test-subj="cloneCancelButton" onClick={this.props.onClose}>
              <FormattedMessage
                id="kbn.dashboard.topNav.cloneModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              fill
              data-test-subj="cloneConfirmButton"
              onClick={this.cloneDashboard}
              isLoading={this.state.isLoading}
            >
              <FormattedMessage
                id="kbn.dashboard.topNav.cloneModal.confirmButtonLabel"
                defaultMessage="Confirm Clone"
              />
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    );
  }
}

export const DashboardCloneModal = injectI18n(DashboardCloneModalUi);
