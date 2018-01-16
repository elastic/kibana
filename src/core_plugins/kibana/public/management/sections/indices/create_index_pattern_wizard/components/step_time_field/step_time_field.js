import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { extractTimeFields } from '../../lib/extract_time_fields';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
        <EuiTitle size="s">
          <h2>
            Step 2 of 2: Configure settings
          </h2>
        </EuiTitle>
        <EuiSpacer size="m"/>
        <EuiText color="subdued">
          <span>
            You&apos;ve defined <strong>{indexPattern}</strong> as your index pattern.
            Now you can specify some settings before we create it.
          </span>
        </EuiText>
        <EuiSpacer size="xs"/>
        <EuiForm>
          { showTimeField ?
            <EuiFormRow
              label={
                <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <span>Time Filter field name</span>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      onClick={this.fetchTimeFields}
                    >
                      Refresh
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              helpText={
                <div>
                  <p>The Time Filter will use this field to filter your data by time.</p>
                  <p>You can choose not to have a time field, but you will not be able to narrow down your data by a time range.</p>
                </div>
              }
            >
              <EuiSelect
                name="timeField"
                options={timeFieldOptions}
                isLoading={!timeFields}
                value={selectedTimeField}
                onChange={this.onTimeFieldChanged}
              />
            </EuiFormRow>
            :
            <EuiText>
              <p>The indices which match this index pattern don&apos;t contain any time fields.</p>
            </EuiText>
          }
        </EuiForm>
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
        { showingAdvancedOptions ?
          <EuiForm>
            <EuiFormRow
              label="Custom index pattern ID"
              helpText={
                <span>
                  Kibana will provide a unique identifier for each index pattern.
                  If you do not want to use this unique ID, enter a custom one.
                </span>
              }
            >
              <EuiFieldText
                name="indexPatternId"
                value={indexPatternId}
                onChange={this.onChangeIndexPatternId}
                placeholder="Id"
              />
            </EuiFormRow>
          </EuiForm>
          : null
        }
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
