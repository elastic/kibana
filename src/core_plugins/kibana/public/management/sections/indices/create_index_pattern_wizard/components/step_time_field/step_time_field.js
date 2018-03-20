import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ensureMinimumTime, extractTimeFields } from '../../lib';

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
              <EuiText>Creating index pattern...</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      );
    }

    const {
      indexPattern,
      goToPreviousStep,
    } = this.props;

    const timeFieldOptions = timeFields ?
      [
        { text: '', value: '' },
        ...timeFields.map(timeField => ({
          text: timeField.display,
          value: timeField.fieldName,
          disabled: timeFields.isDisabled,
        }))
      ]
      : [];

    const showTimeField = !timeFields || timeFields.length > 1;
    const submittable = !showTimeField || timeFieldSet;

    return (
      <EuiPanel paddingSize="l">
        <Header indexPattern={indexPattern}/>
        <EuiSpacer size="xs"/>
        <TimeField
          isVisible={showTimeField}
          fetchTimeFields={this.fetchTimeFields}
          timeFieldOptions={timeFieldOptions}
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
    );
  }
}
