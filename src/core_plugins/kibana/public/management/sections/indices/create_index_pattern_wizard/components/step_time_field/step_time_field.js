import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { extractTimeFields } from '../../lib/extract_time_fields';

import { Header } from './components/header';
import { TimeField } from './components/time_field';
import { AdvancedOptions } from './components/advanced_options';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
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
      showingAdvancedOptions: false,
      indexPatternId: '',
    };
  }

  componentWillMount() {
    this.fetchTimeFields();
  }

  fetchTimeFields = async () => {
    const { indexPatternsService, indexPattern } = this.props;

    const fields = await indexPatternsService.fieldsFetcher.fetchForWildcard(indexPattern);
    const timeFields = extractTimeFields(fields);

    this.setState({ timeFields });
  }

  onTimeFieldChanged = (e) => {
    this.setState({ selectedTimeField: e.target.value });
  }

  onChangeIndexPatternId = (e) => {
    this.setState({ indexPatternId: e.target.value });
  }

  toggleAdvancedOptions = () => {
    this.setState(state => ({
      showingAdvancedOptions: !state.showingAdvancedOptions
    }));
  }

  render() {
    const {
      timeFields,
      selectedTimeField,
      showingAdvancedOptions,
      indexPatternId,
    } = this.state;

    const {
      indexPattern,
      goToPreviousStep,
      createIndexPattern,
    } = this.props;

    const timeFieldOptions = timeFields ?
      [
        { text: '', value: '' },
        ...timeFields.map(timeField => ({
          text: timeField.display,
          value: timeField.fieldName || '',
          isDisabled: timeFields.isDisabled,
        }))
      ]
      : [];

    const showTimeField = !timeFields || timeFields.length > 1;
    const submittable = !showTimeField || selectedTimeField;

    return (
      <EuiPanel paddingSize="l">
        <Header indexPattern={indexPattern}/>
        <EuiSpacer size="xs"/>
        <TimeField
          showTimeField={showTimeField}
          fetchTimeFields={this.fetchTimeFields}
          timeFieldOptions={timeFieldOptions}
          timeFields={timeFields}
          selectedTimeField={selectedTimeField}
          onTimeFieldChanged={this.onTimeFieldChanged}
        />
        <EuiSpacer size="s"/>
        <EuiButtonEmpty
          iconType={showingAdvancedOptions ? 'arrowDown' : 'arrowRight'}
          onClick={this.toggleAdvancedOptions}
        >
          { showingAdvancedOptions
            ? (<span>Hide advanced options</span>)
            : (<span>Show advanced options</span>)
          }

        </EuiButtonEmpty>
        <EuiSpacer size="xs"/>
        <AdvancedOptions
          showingAdvancedOptions={showingAdvancedOptions}
          indexPatternId={indexPatternId}
          onChangeIndexPatternId={this.onChangeIndexPatternId}
        />
        <EuiSpacer size="m"/>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="arrowLeft"
              onClick={goToPreviousStep}
            >
              Back
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              isDisabled={!submittable}
              fill
              onClick={() => createIndexPattern(selectedTimeField, indexPatternId)}
            >
              Create index pattern
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
}
