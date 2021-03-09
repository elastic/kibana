/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment } from 'react';
import _ from 'lodash';
import {
  htmlIdGenerator,
  EuiComboBox,
  EuiFieldNumber,
  EuiFormLabel,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { AddDeleteButtons } from './add_delete_buttons';
// @ts-expect-error not typed yet
import { collectionActions } from './lib/collection_actions';
import { ColorPicker, ColorPickerProps } from './color_picker';
import { TimeseriesVisParams } from '../../types';

interface ColorRulesProps {
  name: keyof TimeseriesVisParams;
  model: TimeseriesVisParams;
  onChange: (partialModel: Partial<TimeseriesVisParams>) => void;
  primaryName?: string;
  primaryVarName?: string;
  secondaryName?: string;
  secondaryVarName?: string;
  hideSecondary?: boolean;
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

export class ColorRules extends Component<ColorRulesProps> {
  constructor(props: ColorRulesProps) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name, cast = String) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = cast(_.get(e, '[0].value', _.get(e, 'target.value')));
      if (part[name] === 'undefined') part[name] = undefined;
      if (cast === Number && isNaN(part[name])) part[name] = undefined;
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const defaults = { value: 0 };
    const model = { ...defaults, ...row };
    const handleAdd = () => collectionActions.handleAdd(this.props);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const operatorOptions = [
      {
        label: i18n.translate('visTypeTimeseries.colorRules.greaterThanLabel', {
          defaultMessage: '> greater than',
        }),
        value: 'gt',
      },
      {
        label: i18n.translate('visTypeTimeseries.colorRules.greaterThanOrEqualLabel', {
          defaultMessage: '>= greater than or equal',
        }),
        value: 'gte',
      },
      {
        label: i18n.translate('visTypeTimeseries.colorRules.lessThanLabel', {
          defaultMessage: '< less than',
        }),
        value: 'lt',
      },
      {
        label: i18n.translate('visTypeTimeseries.colorRules.lessThanOrEqualLabel', {
          defaultMessage: '<= less than or equal',
        }),
        value: 'lte',
      },
    ];
    const handleColorChange: ColorPickerProps['onChange'] = (part) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, model, part));
    };
    const htmlId = htmlIdGenerator(model.id);
    const selectedOperatorOption = operatorOptions.find((option) => {
      return model.operator === option.value;
    });

    const labelStyle = { marginBottom: 0 };

    let secondary;
    if (!this.props.hideSecondary) {
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
              name={this.props.secondaryVarName ?? 'color'}
              value={model[this.props.secondaryVarName ?? 'color']}
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
            value={model[this.props.primaryVarName ?? 'background_color']}
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
            onChange={this.handleChange(model, 'operator')}
            singleSelection={{ asPlainText: true }}
            data-test-subj="colorRuleOperator"
            fullWidth
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFieldNumber
            aria-label={i18n.translate('visTypeTimeseries.colorRules.valueAriaLabel', {
              defaultMessage: 'Value',
            })}
            value={model.value}
            onChange={this.handleChange(model, 'value', Number)}
            data-test-subj="colorRuleValue"
            fullWidth
          />
        </EuiFlexItem>

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
    if (!model[name]) return <div />;
    const rows = (model[name] as any[]).map(this.renderRow);
    return <div>{rows}</div>;
  }
}
