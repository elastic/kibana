/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormLabel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { AddDeleteButtons } from './add_delete_buttons';
import { collectionActions } from './lib/collection_actions';
import { ColorPicker, ColorPickerProps } from './color_picker';
import { TimeseriesVisParams } from '../../types';
import { Operator } from '../../../common/operators_utils';

export interface ColorRulesProps {
  name: keyof TimeseriesVisParams;
  model: TimeseriesVisParams;
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
  primaryName?: string;
  primaryVarName?: string;
  secondaryName?: string;
  secondaryVarName?: string;
  hideSecondary?: boolean;
}

interface ColorRule {
  value?: number;
  id: string;
  background_color?: string;
  color?: string;
  operator?: Operator;
  text?: string;
}

export interface ColorRulesOperator {
  label: string;
  method: Operator;
  value?: unknown;
  hideValueSelector?: boolean;
}

const defaultSecondaryName = i18n.translate(
  'visTypeTimeseries.colorRules.defaultSecondaryNameLabel',
  {
    defaultMessage: 'text',
  }
);
const defaultPrimaryName = i18n.translate('visTypeTimeseries.colorRules.defaultPrimaryNameLabel', {
  defaultMessage: 'background',
});

export const colorRulesOperatorsList: ColorRulesOperator[] = [
  {
    label: i18n.translate('visTypeTimeseries.colorRules.greaterThanLabel', {
      defaultMessage: '> greater than',
    }),
    method: Operator.Gt,
  },
  {
    label: i18n.translate('visTypeTimeseries.colorRules.greaterThanOrEqualLabel', {
      defaultMessage: '>= greater than or equal',
    }),
    method: Operator.Gte,
  },
  {
    label: i18n.translate('visTypeTimeseries.colorRules.lessThanLabel', {
      defaultMessage: '< less than',
    }),
    method: Operator.Lt,
  },
  {
    label: i18n.translate('visTypeTimeseries.colorRules.lessThanOrEqualLabel', {
      defaultMessage: '<= less than or equal',
    }),
    method: Operator.Lte,
  },
  {
    label: i18n.translate('visTypeTimeseries.colorRules.emptyLabel', {
      defaultMessage: 'empty',
    }),
    method: Operator.Empty,
    hideValueSelector: true,
  },
];

const operatorOptions = colorRulesOperatorsList.map((operator) => ({
  label: operator.label,
  value: operator.method,
}));

export class ColorRules extends Component<ColorRulesProps> {
  constructor(props: ColorRulesProps) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleValueChange(item: ColorRule) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value: number | undefined = Number(e.target.value);
      if (isNaN(value)) value = undefined;
      collectionActions.handleChange(this.props, {
        ...item,
        value,
      });
    };
  }

  handleOperatorChange = (item: ColorRule) => {
    return (options: Array<EuiComboBoxOptionOption<string>>) => {
      const selectedOperator = colorRulesOperatorsList.find(
        (operator) => options[0]?.value === operator.method
      );
      const value = selectedOperator?.value ?? null;
      collectionActions.handleChange(this.props, {
        ...item,
        operator: options[0]?.value,
        value,
      });
    };
  };

  renderRow(row: ColorRule, i: number, items: ColorRule[]) {
    const defaults = { value: 0 };
    const model = { ...defaults, ...row };
    const handleAdd = () => collectionActions.handleAdd(this.props);
    const handleDelete = () => collectionActions.handleDelete(this.props, model);
    const handleColorChange: ColorPickerProps['onChange'] = (part) => {
      collectionActions.handleChange(this.props, { ...model, ...part });
    };
    const htmlId = htmlIdGenerator(model.id);
    const selectedOperatorOption = operatorOptions.find(
      (option) => model.operator === option.value
    );
    const selectedOperator = colorRulesOperatorsList.find(
      (operator) => model.operator === operator.method
    );

    const hideValueSelectorField = selectedOperator?.hideValueSelector ?? false;
    const labelStyle = { marginBottom: 0 };

    let secondary;
    if (!this.props.hideSecondary) {
      const secondaryVarName = this.props.secondaryVarName ?? 'color';
      secondary = (
        <Fragment>
          <EuiFlexItem grow={false}>
            <EuiFormLabel style={labelStyle}>
              <FormattedMessage
                id="visTypeTimeseries.colorRules.setSecondaryColorLabel"
                defaultMessage="and {secondaryName} to"
                values={{ secondaryName: this.props.secondaryName ?? defaultSecondaryName }}
                description="Part of a larger string: Set {primaryName} to {color} and {secondaryName} to {color} if
                metric is {greaterOrLessThan} {value}."
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ColorPicker
              onChange={handleColorChange}
              name={secondaryVarName}
              value={model[secondaryVarName as keyof ColorRule] as string | undefined}
            />
          </EuiFlexItem>
        </Fragment>
      );
    }
    return (
      <EuiFlexGroup
        wrap={true}
        responsive={false}
        gutterSize="s"
        key={model.id}
        alignItems="center"
        className="tvbColorRules__rule"
      >
        <EuiFlexItem grow={false}>
          <EuiFormLabel style={labelStyle}>
            <FormattedMessage
              id="visTypeTimeseries.colorRules.setPrimaryColorLabel"
              defaultMessage="Set {primaryName} to"
              values={{ primaryName: this.props.primaryName ?? defaultPrimaryName }}
              description="Part of a larger string: Set {primaryName} to {color} and {secondaryName} to {color} if
              metric is {greaterOrLessThan} {value}."
            />
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ColorPicker
            onChange={handleColorChange}
            name={this.props.primaryVarName ?? 'background_color'}
            value={
              model[(this.props.primaryVarName ?? 'background_color') as keyof ColorRule] as
                | string
                | undefined
            }
          />
        </EuiFlexItem>

        {secondary}

        <EuiFlexItem grow={false}>
          <EuiFormLabel style={labelStyle} htmlFor={htmlId('ifMetricIs')}>
            <FormattedMessage
              id="visTypeTimeseries.colorRules.ifMetricIsLabel"
              defaultMessage="if metric is"
              description="Part of a larger string: Set {primaryName} to {color} and {secondaryName} to {color} if
              metric is {greaterOrLessThan} {value}."
            />
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiComboBox
            id={htmlId('ifMetricIs')}
            options={operatorOptions}
            selectedOptions={selectedOperatorOption ? [selectedOperatorOption] : []}
            onChange={this.handleOperatorChange(model)}
            singleSelection={{ asPlainText: true }}
            data-test-subj="colorRuleOperator"
            fullWidth
          />
        </EuiFlexItem>
        {!hideValueSelectorField && (
          <EuiFlexItem>
            <EuiFieldNumber
              aria-label={i18n.translate('visTypeTimeseries.colorRules.valueAriaLabel', {
                defaultMessage: 'Value',
              })}
              value={model.value ?? ''}
              onChange={this.handleValueChange(model)}
              data-test-subj="colorRuleValue"
              fullWidth
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
            disableDelete={items.length < 2}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const { model, name } = this.props;
    return !model[name] ? <div /> : <div>{(model[name] as ColorRule[]).map(this.renderRow)}</div>;
  }
}
