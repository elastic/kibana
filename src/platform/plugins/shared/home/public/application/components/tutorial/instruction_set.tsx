/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import {
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiSteps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiTitle,
  EuiSplitPanel,
} from '@elastic/eui';
import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme'; // FIXME: remove this, and access style variables from EUI context
import { Instruction } from './instruction';
import { Content } from './content';
import { INSTRUCTION_VARIANT, getDisplayText } from '../../..';
import * as StatusCheckStates from './status_check_states';
import type {
  InstructionSetType,
  InstructionVariantType,
  InstructionType,
} from '../../../services/tutorials/types';

interface InstructionStep {
  key: number | string;
  title: string;
  children: React.JSX.Element;
  status?: 'incomplete' | 'complete' | 'warning' | 'danger';
}

interface InstructionSetProps extends InstructionSetType {
  instructionVariants: InstructionSetType['instructionVariants'];
  statusCheckConfig: InstructionSetType['statusCheck'];
  statusCheckState: keyof typeof StatusCheckStates;
  onStatusCheck: () => void;
  offset: number;
  replaceTemplateStrings: (text: string) => string;
  isCloudEnabled: boolean;
  intl: InjectedIntl;
}
interface InstructionSetState {
  selectedTabId: string;
}
interface InstructionSetTab {
  id: string;
  name: string;
  initialSelected?: boolean;
}
class InstructionSetUi extends React.Component<InstructionSetProps, InstructionSetState> {
  tabs: InstructionSetTab[];

  constructor(props: InstructionSetProps) {
    super(props);
    this.tabs = this.initializeTabs(props.instructionVariants);
    this.state = this.initializeState(this.tabs);
  }

  initializeTabs(instructionVariants: InstructionSetType['instructionVariants']) {
    return instructionVariants.map((variant) => ({
      id: variant.id,
      name: getDisplayText(variant.id as keyof typeof INSTRUCTION_VARIANT),
      initialSelected: variant.initialSelected,
    }));
  }

  initializeState(tabs: InstructionSetTab[]) {
    const initialState = {
      selectedTabId:
        tabs.length > 0
          ? tabs.find(({ initialSelected }) => initialSelected)?.id ?? tabs[0].id
          : '',
    };

    return initialState;
  }

  onSelectedTabChanged = (id: string) => {
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
    let color: 'success' | 'warning' | undefined;
    switch (this.props.statusCheckState) {
      case StatusCheckStates.NOT_CHECKED:
      case StatusCheckStates.FETCHING:
        return null; // Don't show any message while fetching or if you haven't yet checked.
      case StatusCheckStates.HAS_DATA:
        message = this.props.statusCheckConfig?.success
          ? this.props.statusCheckConfig.success
          : this.props.intl.formatMessage({
              id: 'home.tutorial.instructionSet.successLabel',
              defaultMessage: 'Success',
            });
        color = 'success';
        break;
      case StatusCheckStates.ERROR:
      case StatusCheckStates.NO_DATA:
        message = this.props.statusCheckConfig?.error
          ? this.props.statusCheckConfig.error
          : this.props.intl.formatMessage({
              id: 'home.tutorial.instructionSet.noDataLabel',
              defaultMessage: 'No data found',
            });
        color = 'warning';
        break;
    }
    return (
      <>
        <EuiSpacer size="s" />
        <EuiCallOut title={message} color={color} />
      </>
    );
  }

  getStepStatus(
    statusCheckState: InstructionSetProps['statusCheckState']
  ): InstructionStep['status'] {
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
              id: 'home.tutorial.unexpectedStatusCheckStateErrorDescription',
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
        <Content text={statusCheckConfig?.text || ''} />

        <EuiSpacer size="s" />
        <EuiButton
          onClick={onStatusCheck}
          isLoading={statusCheckState === StatusCheckStates.FETCHING}
          data-test-subj="statusCheckButton"
        >
          {statusCheckConfig?.btnLabel || (
            <FormattedMessage
              id="home.tutorial.instructionSet.checkStatusButtonLabel"
              defaultMessage="Check status"
            />
          )}
        </EuiButton>

        {this.renderStatusCheckMessage()}
      </Fragment>
    );

    return {
      title:
        statusCheckConfig?.title ||
        this.props.intl.formatMessage({
          id: 'home.tutorial.instructionSet.statusCheckTitle',
          defaultMessage: 'Status Check',
        }),
      status: this.getStepStatus(statusCheckState),
      children: checkStatusStep,
      key: 'checkStatusStep',
    };
  }

  renderInstructions = () => {
    const instructionVariant = this.props.instructionVariants.find(
      (variant: InstructionVariantType) => {
        return variant.id === this.state.selectedTabId;
      }
    );
    if (!instructionVariant) {
      return;
    }

    const steps: EuiContainedStepProps[] = instructionVariant.instructions.map(
      (instruction: InstructionType, index: number) => {
        const step = (
          <Instruction
            commands={instruction.commands}
            textPre={instruction.textPre}
            textPost={instruction.textPost}
            replaceTemplateStrings={this.props.replaceTemplateStrings}
            customComponentName={instruction.customComponentName}
            variantId={instructionVariant.id}
            isCloudEnabled={this.props.isCloudEnabled}
          />
        );
        return {
          title: instruction.title || '',
          children: step,
          key: index,
        };
      }
    );

    if (this.props.statusCheckConfig) {
      steps.push(this.renderStatusCheck());
    }

    return (
      <>
        <EuiSpacer />
        <EuiSteps titleSize="xs" steps={steps} firstStepNumber={this.props.offset} />
      </>
    );
  };

  renderHeader = () => {
    return (
      <EuiFlexGroup responsive={false} wrap justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2>{this.props.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  renderCallOut = () => {
    if (!this.props.callOut) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <EuiCallOut
          title={this.props.callOut.title}
          children={this.props.callOut.message}
          iconType={this.props.callOut.iconType}
        />
      </>
    );
  };

  render() {
    return (
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner color="subdued" paddingSize="none">
          <EuiTabs css={{ padding: `0 ${euiThemeVars.euiSizeL}` }}>{this.renderTabs()}</EuiTabs>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="l">
          {this.renderHeader()}
          {this.renderCallOut()}
          {this.renderInstructions()}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    );
  }
}

export const InstructionSet = injectI18n(InstructionSetUi);
