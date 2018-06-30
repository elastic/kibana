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
import PropTypes from 'prop-types';
import { ensureMinimumTime, extractTimeFields, timeFieldsTypes } from '../../lib';

import { Header } from './components/header';
import { TimeField } from './components/time_field';
import { AdvancedOptions } from './components/advanced_options';
import { ActionButtons } from './components/action_buttons';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { I18nContext, FormattedMessage } = ReactI18n;

export class StepTimeField extends Component {
  static propTypes = {
    indexPattern: PropTypes.string.isRequired,
    indexPatternsService: PropTypes.object.isRequired,
    goToPreviousStep: PropTypes.func.isRequired,
    createIndexPattern: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      timeFields: [],
      selectedTimeField: undefined,
      timeFieldSet: false,
      isAdvancedOptionsVisible: false,
      isFetchingTimeFields: false,
      isCreating: false,
      indexPatternId: '',
    };
  }

  componentWillMount() {
    this.fetchTimeFields();
  }

  fetchTimeFields = async () => {
    const { indexPatternsService, indexPattern } = this.props;

    this.setState({ isFetchingTimeFields: true });
    const fields = await ensureMinimumTime(indexPatternsService.fieldsFetcher.fetchForWildcard(indexPattern));
    const timeFields = extractTimeFields(fields);

    this.setState({ timeFields, isFetchingTimeFields: false });
  }

  onTimeFieldChanged = (e) => {
    const value = e.target.value;

    // Find the time field based on the selected value
    const timeField = this.state.timeFields.find(timeField => timeField.fieldName === value);

    // If the value is an empty string, it's not a valid selection
    const validSelection = value !== '';

    this.setState({
      selectedTimeField: timeField ? timeField.fieldName : undefined,
      timeFieldSet: validSelection,
    });
  }

  onChangeIndexPatternId = (e) => {
    this.setState({ indexPatternId: e.target.value });
  }

  toggleAdvancedOptions = () => {
    this.setState(state => ({
      isAdvancedOptionsVisible: !state.isAdvancedOptionsVisible
    }));
  }

  createIndexPattern = () => {
    const { selectedTimeField, indexPatternId } = this.state;
    this.setState({ isCreating: true });
    this.props.createIndexPattern(selectedTimeField, indexPatternId);
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
    } = this.state;

    if (isCreating) {
      return (
        <EuiPanel>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner/>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <FormattedMessage
                  id="kbn.management.indexPattern.create.stepTime.creating.label"
                  defaultMessage="Creating index pattern..."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }

    const {
      indexPattern,
      goToPreviousStep,
    } = this.props;

    const getText = (intl, key) => {
      switch (key) {
        case timeFieldsTypes.NO_TIME_FIELDS: return intl.formatMessage({
          id: 'kbn.management.indexPattern.create.stepTime.noTimeFields.label',
          defaultMessage: 'The indices which match this index pattern don\'t contain any time fields.' });
        case timeFieldsTypes.NO_TIME_FIELD: return intl.formatMessage({
          id: 'kbn.management.indexPattern.create.stepTime.noTimeFieldOption.label',
          defaultMessage: 'I don\'t want to use the Time Filter' });
        default: return key;
      }
    };

    const getTimeFieldOptions = intl => (timeFields ?
      [
        { text: '', value: '' },
        ...timeFields.map(timeField => ({
          text: getText(intl, timeField.display),
          value: timeField.fieldName,
          disabled: timeFields.isDisabled,
        }))
      ]
      : []);

    const showTimeField = !timeFields || timeFields.length > 1;
    const submittable = !showTimeField || timeFieldSet;

    return (
      <I18nContext>
        {intl => (
          <EuiPanel paddingSize="l">
            <Header indexPattern={indexPattern}/>
            <EuiSpacer size="xs"/>
            <TimeField
              isVisible={showTimeField}
              fetchTimeFields={this.fetchTimeFields}
              timeFieldOptions={getTimeFieldOptions(intl)}
              isLoading={isFetchingTimeFields}
              selectedTimeField={selectedTimeField}
              onTimeFieldChanged={this.onTimeFieldChanged}
            />
            <EuiSpacer size="s"/>
            <AdvancedOptions
              isVisible={isAdvancedOptionsVisible}
              indexPatternId={indexPatternId}
              toggleAdvancedOptions={this.toggleAdvancedOptions}
              onChangeIndexPatternId={this.onChangeIndexPatternId}
            />
            <EuiSpacer size="m"/>
            <ActionButtons
              goToPreviousStep={goToPreviousStep}
              submittable={submittable}
              createIndexPattern={this.createIndexPattern}
            />
          </EuiPanel>
        )}
      </I18nContext>
    );
  }
}
