/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiRange,
  EuiSelect,
  EuiTextArea,
} from '@elastic/eui';
import type { Action, CatalogComponent } from '@kbn/a2ui-renderer';
import { bool, num, objectArray, oneOf, optionalStr, str } from '../coerce';

export const Button: CatalogComponent = {
  name: 'Button',
  render: ({ props, rawProps, dispatchAction, accessibility }) => {
    const variant = oneOf(
      props.variant,
      ['default', 'primary', 'danger', 'borderless'] as const,
      'default'
    );
    const shared = {
      iconType: optionalStr(props.iconType),
      isDisabled: bool(props.disabled),
      fullWidth: bool(props.fullWidth),
      onClick: () => dispatchAction(rawProps.action as Action | undefined),
      'aria-label': accessibility?.label,
    };
    const label = str(props.label);

    if (variant === 'borderless') return <EuiButtonEmpty {...shared}>{label}</EuiButtonEmpty>;

    return (
      <EuiButton
        {...shared}
        fill={variant === 'primary'}
        color={variant === 'danger' ? 'danger' : 'primary'}
      >
        {label}
      </EuiButton>
    );
  },
};

export const TextField: CatalogComponent = {
  name: 'TextField',
  render: ({ id, props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    const disabled = bool(props.disabled) || !path;
    const value = str(props.value);
    const variant = oneOf(
      props.variant,
      ['shortText', 'longText', 'number', 'obscured'] as const,
      'shortText'
    );

    const onChange = (next: string | number) => {
      if (path) setValue(path, next);
    };

    const shared = {
      id,
      value,
      disabled,
      placeholder: optionalStr(props.placeholder),
      'aria-label': accessibility?.label ?? str(props.label),
      fullWidth: true,
    };

    return (
      <EuiFormRow
        label={str(props.label)}
        helpText={optionalStr(props.helpText)}
        fullWidth
        aria-describedby={accessibility?.description}
      >
        {variant === 'longText' ? (
          <EuiTextArea {...shared} onChange={(e) => onChange(e.target.value)} />
        ) : variant === 'number' ? (
          <EuiFieldNumber
            {...shared}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        ) : variant === 'obscured' ? (
          <EuiFieldPassword {...shared} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <EuiFieldText {...shared} onChange={(e) => onChange(e.target.value)} />
        )}
      </EuiFormRow>
    );
  },
};

export const CheckBox: CatalogComponent = {
  name: 'CheckBox',
  render: ({ id, props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    return (
      <EuiCheckbox
        id={id}
        label={str(props.label)}
        checked={bool(props.value)}
        disabled={bool(props.disabled) || !path}
        aria-label={accessibility?.label}
        onChange={(e) => path && setValue(path, e.target.checked)}
      />
    );
  },
};

export const ChoicePicker: CatalogComponent = {
  name: 'ChoicePicker',
  render: ({ id, props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    const options = objectArray(props.options).map((option) => ({
      value: str(option.value),
      text: str(option.label, str(option.value)),
    }));

    return (
      <EuiFormRow label={str(props.label)} fullWidth>
        <EuiSelect
          id={id}
          options={options}
          value={str(props.value)}
          disabled={bool(props.disabled) || !path}
          fullWidth
          aria-label={accessibility?.label ?? str(props.label)}
          onChange={(e) => path && setValue(path, e.target.value)}
        />
      </EuiFormRow>
    );
  },
};

export const Slider: CatalogComponent = {
  name: 'Slider',
  render: ({ id, props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    return (
      <EuiFormRow label={str(props.label)} fullWidth>
        <EuiRange
          id={id}
          min={num(props.min, 0)}
          max={num(props.max, 100)}
          step={num(props.step, 1)}
          value={num(props.value)}
          showValue={bool(props.showValue, true)}
          disabled={bool(props.disabled) || !path}
          fullWidth
          aria-label={accessibility?.label ?? str(props.label)}
          onChange={(e) => path && setValue(path, Number((e.target as HTMLInputElement).value))}
        />
      </EuiFormRow>
    );
  },
};

export const DateTimeInput: CatalogComponent = {
  name: 'DateTimeInput',
  render: ({ props, getBindingPath, setValue, accessibility }) => {
    const path = getBindingPath('value');
    const raw = optionalStr(props.value);
    const parsed = raw ? moment(raw) : undefined;
    const showTime = bool(props.showTime);

    return (
      <EuiFormRow label={str(props.label)} fullWidth>
        <EuiDatePicker
          selected={parsed && parsed.isValid() ? parsed : undefined}
          showTimeSelect={showTime}
          disabled={bool(props.disabled) || !path}
          fullWidth
          aria-label={accessibility?.label ?? str(props.label)}
          onChange={(date) => {
            if (!path) return;
            setValue(path, date ? date.toISOString() : null);
          }}
        />
      </EuiFormRow>
    );
  },
};
