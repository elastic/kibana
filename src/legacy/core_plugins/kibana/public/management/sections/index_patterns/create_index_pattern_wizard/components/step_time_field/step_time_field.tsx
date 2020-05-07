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
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ensureMinimumTime, extractTimeFields } from '../../lib';

import { Header } from './components/header';
import { TimeField } from './components/time_field';
import { AdvancedOptions } from './components/advanced_options';
import { ActionButtons } from './components/action_buttons';
import { IndexPatternCreationConfig } from '../../../../../../../../../../plugins/index_pattern_management/public';
import { DataPublicPluginStart } from '../../../../../../../../../../plugins/data/public';

interface StepTimeFieldProps {
  indexPattern: string;
  indexPatternsService: DataPublicPluginStart['indexPatterns'];
  goToPreviousStep: () => void;
  createIndexPattern: (selectedTimeField: string | undefined, indexPatternId: string) => void;
  indexPatternCreationType: IndexPatternCreationConfig;
}

interface StepTimeFieldState {
  error: string;
  timeFields: TimeFieldConfig[];
  selectedTimeField?: string;
  timeFieldSet: boolean;
  isAdvancedOptionsVisible: boolean;
  isFetchingTimeFields: boolean;
  isCreating: boolean;
  indexPatternId: string;
  indexPatternType: string;
  indexPatternName: string;
}

interface TimeFieldConfig {
  display: string;
  fieldName?: string;
  isDisabled?: boolean;
}

export class StepTimeField extends Component<StepTimeFieldProps, StepTimeFieldState> {
  state = {
    error: '',
    timeFields: [],
    selectedTimeField: undefined,
    timeFieldSet: false,
    isAdvancedOptionsVisible: false,
    isFetchingTimeFields: false,
    isCreating: false,
    indexPatternId: '',
    indexPatternType: '',
    indexPatternName: '',
  };

  constructor(props: StepTimeFieldProps) {
    super(props);
    this.state.indexPatternType = props.indexPatternCreationType.getIndexPatternType() || '';
    this.state.indexPatternName = props.indexPatternCreationType.getIndexPatternName();
  }

  mounted = false;

  componentDidMount() {
    this.mounted = true;
    this.fetchTimeFields();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  fetchTimeFields = async () => {
    const { indexPatternsService, indexPattern: pattern } = this.props;
    const { getFetchForWildcardOptions } = this.props.indexPatternCreationType;

    const indexPattern = await indexPatternsService.make();
    indexPattern.title = pattern;

    this.setState({ isFetchingTimeFields: true });
    const fields = await ensureMinimumTime(
      indexPattern.fieldsFetcher.fetchForWildcard(pattern, getFetchForWildcardOptions())
    );
    const timeFields = extractTimeFields(fields);

    this.setState({ timeFields, isFetchingTimeFields: false });
  };

  onTimeFieldChanged = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    // Find the time field based on the selected value
    const timeField = this.state.timeFields.find(
      (timeFld: TimeFieldConfig) => timeFld.fieldName === value
    );

    // If the value is an empty string, it's not a valid selection
    const validSelection = value !== '';

    this.setState({
      selectedTimeField: timeField ? (timeField as TimeFieldConfig).fieldName : undefined,
      timeFieldSet: validSelection,
    });
  };

  onChangeIndexPatternId = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ indexPatternId: e.target.value });
  };

  toggleAdvancedOptions = () => {
    this.setState(state => ({
      isAdvancedOptionsVisible: !state.isAdvancedOptionsVisible,
    }));
  };

  createIndexPattern = async () => {
    const { createIndexPattern } = this.props;
    const { selectedTimeField, indexPatternId } = this.state;
    this.setState({ isCreating: true });
    try {
      await createIndexPattern(selectedTimeField, indexPatternId);
    } catch (error) {
      if (!this.mounted) return;
      this.setState({
        error: error instanceof Error ? error.message : String(error),
        isCreating: false,
      });
    }
  };

  formatErrorMessage(message: string) {
    // `createIndexPattern` throws "Conflict" when index pattern ID already exists.
    return message === 'Conflict' ? (
      <FormattedMessage
        id="kbn.management.createIndexPattern.stepTime.patterAlreadyExists"
        defaultMessage="Custom index pattern ID already exists."
      />
    ) : (
      message
    );
  }

  render() {
    const {
      timeFields,
      selectedTimeField,
      timeFieldSet,
      isAdvancedOptionsVisible,
      indexPatternId,
      isCreating,
      isFetchingTimeFields,
      indexPatternName,
    } = this.state;

    if (isCreating) {
      return (
        <EuiPanel>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.stepTime.creatingLabel"
                  defaultMessage="Creating index pattern…"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }

    const { indexPattern, goToPreviousStep } = this.props;

    const timeFieldOptions =
      timeFields.length > 0
        ? [
            { text: '', value: '' },
            ...timeFields.map((timeField: TimeFieldConfig) => ({
              text: timeField.display,
              value: timeField.fieldName,
              disabled: ((timeFields as unknown) as TimeFieldConfig).isDisabled,
            })),
          ]
        : [];

    const showTimeField = !timeFields || timeFields.length > 1;
    const submittable = !showTimeField || timeFieldSet;
    const error = this.state.error ? (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="kbn.management.createIndexPattern.stepTime.error"
              defaultMessage="Error"
            />
          }
          color="danger"
          iconType="cross"
        >
          <p>{this.formatErrorMessage(this.state.error)}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    ) : null;

    return (
      <EuiPanel paddingSize="l">
        <Header indexPattern={indexPattern} indexPatternName={indexPatternName} />
        <EuiSpacer size="m" />
        <TimeField
          isVisible={showTimeField}
          fetchTimeFields={this.fetchTimeFields}
          timeFieldOptions={timeFieldOptions}
          isLoading={isFetchingTimeFields}
          selectedTimeField={selectedTimeField}
          onTimeFieldChanged={this.onTimeFieldChanged}
        />
        <EuiSpacer size="s" />
        <AdvancedOptions
          isVisible={isAdvancedOptionsVisible}
          indexPatternId={indexPatternId}
          toggleAdvancedOptions={this.toggleAdvancedOptions}
          onChangeIndexPatternId={this.onChangeIndexPatternId}
        />
        <EuiSpacer size="m" />
        {error}
        <ActionButtons
          goToPreviousStep={goToPreviousStep}
          submittable={submittable}
          createIndexPattern={this.createIndexPattern}
        />
      </EuiPanel>
    );
  }
}
