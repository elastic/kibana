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
import PropTypes from 'prop-types';
import { Instruction } from './instruction';
import { ParameterForm } from './parameter_form';
import { Content } from './content';
import { getDisplayText } from '../../../../common/tutorials/instruction_variant';
import {
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiSteps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import * as StatusCheckStates from './status_check_states';

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

class InstructionSetUi extends React.Component {
  constructor(props) {
    super(props);

    this.tabs = props.instructionVariants.map(variant => {
      return {
        id: variant.id,
        name: getDisplayText(variant.id),
      };
    });

    this.state = {
      isParamFormVisible: false,
    };

    if (this.tabs.length > 0) {
      this.state.selectedTabId = this.tabs[0].id;
    }
  }

  handleToggleVisibility = () => {
    this.setState(prevState => ({ isParamFormVisible: !prevState.isParamFormVisible }));
  };

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
  };

  renderTabs = () => {
    return this.tabs.map((tab, index) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  renderStatusCheckMessage() {
    let message;
    let color;
    switch (this.props.statusCheckState) {
      case StatusCheckStates.NOT_CHECKED:
      case StatusCheckStates.FETCHING:
        return null; // Don't show any message while fetching or if you haven't yet checked.
      case StatusCheckStates.HAS_DATA:
        message = this.props.statusCheckConfig.success
          ? this.props.statusCheckConfig.success
          : this.props.intl.formatMessage({
              id: 'kbn.home.tutorial.instructionSet.successLabel',
              defaultMessage: 'Success',
            });
        color = 'success';
        break;
      case StatusCheckStates.ERROR:
      case StatusCheckStates.NO_DATA:
        message = this.props.statusCheckConfig.error
          ? this.props.statusCheckConfig.error
          : this.props.intl.formatMessage({
              id: 'kbn.home.tutorial.instructionSet.noDataLabel',
              defaultMessage: 'No data found',
            });
        color = 'warning';
        break;
    }
    return <EuiCallOut title={message} color={color} />;
  }

  getStepStatus(statusCheckState) {
    switch (statusCheckState) {
      case undefined:
      case StatusCheckStates.NOT_CHECKED:
      case StatusCheckStates.FETCHING:
        return 'incomplete';
      case StatusCheckStates.HAS_DATA:
        return 'complete';
      case StatusCheckStates.NO_DATA:
        return 'warning';
      case StatusCheckStates.ERROR:
        return 'danger';
      default:
        throw new Error(
          this.props.intl.formatMessage(
            {
              id: 'kbn.home.tutorial.unexpectedStatusCheckStateErrorDescription',
              defaultMessage: 'Unexpected status check state {statusCheckState}',
            },
            {
              statusCheckState,
            }
          )
        );
    }
  }

  renderStatusCheck() {
    const { statusCheckState, statusCheckConfig, onStatusCheck } = this.props;
    const checkStatusStep = (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <Content text={statusCheckConfig.text} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onStatusCheck}
              isLoading={statusCheckState === StatusCheckStates.FETCHING}
            >
              {statusCheckConfig.btnLabel || (
                <FormattedMessage
                  id="kbn.home.tutorial.instructionSet.checkStatusButtonLabel"
                  defaultMessage="Check status"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        {this.renderStatusCheckMessage()}
      </Fragment>
    );

    return {
      title:
        statusCheckConfig.title ||
        this.props.intl.formatMessage({
          id: 'kbn.home.tutorial.instructionSet.statusCheckTitle',
          defaultMessage: 'Status Check',
        }),
      status: this.getStepStatus(statusCheckState),
      children: checkStatusStep,
      key: 'checkStatusStep',
    };
  }

  renderInstructions = () => {
    const instructionVariant = this.props.instructionVariants.find(variant => {
      return variant.id === this.state.selectedTabId;
    });
    if (!instructionVariant) {
      return;
    }

    const steps = instructionVariant.instructions.map((instruction, index) => {
      const step = (
        <Instruction
          commands={instruction.commands}
          paramValues={this.props.paramValues}
          textPre={instruction.textPre}
          textPost={instruction.textPost}
          replaceTemplateStrings={this.props.replaceTemplateStrings}
        />
      );
      return {
        title: instruction.title,
        children: step,
        key: index,
      };
    });

    if (this.props.statusCheckConfig) {
      steps.push(this.renderStatusCheck());
    }

    return <EuiSteps steps={steps} firstStepNumber={this.props.offset} />;
  };

  renderHeader = () => {
    let paramsVisibilityToggle;
    if (this.props.params) {
      const ariaLabel = this.props.intl.formatMessage({
        id: 'kbn.home.tutorial.instructionSet.toggleAriaLabel',
        defaultMessage: 'toggle command parameters visibility',
      });
      paramsVisibilityToggle = (
        <EuiButtonEmpty
          iconType={this.state.isParamFormVisible ? 'arrowDown' : 'arrowRight'}
          aria-label={ariaLabel}
          onClick={this.handleToggleVisibility}
        >
          <FormattedMessage
            id="kbn.home.tutorial.instructionSet.customizeLabel"
            defaultMessage="Customize your code snippets"
          />
        </EuiButtonEmpty>
      );
    }

    return (
      <EuiFlexGroup responsive={false} wrap justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{this.props.title}</h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>{paramsVisibilityToggle}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  renderCallOut = () => {
    if (!this.props.callOut) {
      return null;
    }

    return (
      <EuiCallOut
        title={this.props.callOut.title}
        children={this.props.callOut.message}
        iconType={this.props.callOut.iconType}
      />
    );
  };

  render() {
    let paramsForm;
    if (this.props.params && this.state.isParamFormVisible) {
      paramsForm = (
        <ParameterForm
          params={this.props.params}
          paramValues={this.props.paramValues}
          setParameter={this.props.setParameter}
        />
      );
    }

    return (
      <div>
        {this.renderHeader()}

        {this.renderCallOut()}

        {paramsForm}

        <EuiTabs>{this.renderTabs()}</EuiTabs>

        <EuiSpacer size="m" />

        {this.renderInstructions()}
      </div>
    );
  }
}

const instructionShape = PropTypes.shape({
  title: PropTypes.string,
  textPre: PropTypes.string,
  commands: PropTypes.arrayOf(PropTypes.string),
  textPost: PropTypes.string,
});

const instructionVariantShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  instructions: PropTypes.arrayOf(instructionShape).isRequired,
});

const statusCheckConfigShape = PropTypes.shape({
  success: PropTypes.string,
  error: PropTypes.string,
  title: PropTypes.string,
  text: PropTypes.string,
  btnLabel: PropTypes.string,
});

InstructionSetUi.propTypes = {
  title: PropTypes.string.isRequired,
  callOut: PropTypes.object,
  instructionVariants: PropTypes.arrayOf(instructionVariantShape).isRequired,
  statusCheckConfig: statusCheckConfigShape,
  statusCheckState: PropTypes.oneOf([
    StatusCheckStates.FETCHING,
    StatusCheckStates.NOT_CHECKED,
    StatusCheckStates.HAS_DATA,
    StatusCheckStates.NO_DATA,
    StatusCheckStates.ERROR,
  ]),
  onStatusCheck: PropTypes.func.isRequired,
  offset: PropTypes.number.isRequired,
  params: PropTypes.array,
  paramValues: PropTypes.object.isRequired,
  setParameter: PropTypes.func,
  replaceTemplateStrings: PropTypes.func.isRequired,
};

export const InstructionSet = injectI18n(InstructionSetUi);
