/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButton, EuiComboBox, EuiForm, EuiFormRow } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface GroupByOptions {
  text: string;
  field: string;
}

interface Props {
  onSubmit: (field: string) => void;
  fields: FieldSpec[];
  currentOptions: GroupByOptions[];
}

interface SelectedOption {
  label: string;
}

const initialState = {
  selectedOptions: [] as SelectedOption[],
};

type State = Readonly<typeof initialState>;

export class CustomFieldPanel extends React.PureComponent<Props, State> {
  public static displayName = 'CustomFieldPanel';
  public readonly state: State = initialState;
  public render() {
    const { fields, currentOptions } = this.props;
    const options = fields
      .filter(
        (f) =>
          f.aggregatable &&
          f.type === 'string' &&
          !(currentOptions && currentOptions.some((o) => o.field === f.name))
      )
      .map<EuiComboBoxOptionOption>((f) => ({ label: f.name }));
    const isSubmitDisabled = !this.state.selectedOptions.length;
    return (
      <div data-test-subj="custom-field-panel" style={{ padding: 16 }}>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('grouping.groupSelector.customGroupByFieldLabel', {
              defaultMessage: 'Field',
            })}
            helpText={i18n.translate('grouping.groupSelector.customGroupByHelpText', {
              defaultMessage: 'This is the field used for the terms aggregation',
            })}
            display="rowCompressed"
            fullWidth
          >
            <EuiComboBox
              data-test-subj="groupByCustomField"
              placeholder={i18n.translate(
                'grouping.groupSelector.customGroupByDropdownPlacehoder',
                {
                  defaultMessage: 'Select one',
                }
              )}
              singleSelection={{ asPlainText: true }}
              selectedOptions={this.state.selectedOptions}
              options={options as EuiComboBoxOptionOption[]}
              onChange={this.handleFieldSelection}
              fullWidth
              isClearable={false}
            />
          </EuiFormRow>
          <EuiButton
            data-test-subj="groupByCustomFieldAddButton"
            disabled={isSubmitDisabled}
            type="submit"
            size="s"
            fill
            onClick={this.handleSubmit}
          >
            {i18n.translate('grouping.selector.grouping.label.add', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </EuiForm>
      </div>
    );
  }
  private handleSubmit = () => {
    this.props.onSubmit(this.state.selectedOptions[0].label);
  };

  private handleFieldSelection = (selectedOptions: SelectedOption[]) => {
    this.setState({ selectedOptions });
  };
}
