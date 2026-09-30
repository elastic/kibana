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
  EuiButtonIcon,
  EuiCheckbox,
  EuiComboBox,
  EuiDatePicker,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiFieldSearch,
  EuiFieldText,
  EuiFormRow,
  EuiRange,
  EuiSelect,
  EuiTextArea,
} from '@elastic/eui';
import type { Action, CatalogComponent } from '@kbn/a2ui-renderer';
import { bool, num, objectArray, oneOf, optionalStr, str } from '../coerce';

const BUTTON_COLORS = ['primary', 'text', 'success', 'warning', 'danger', 'accent'] as const;
const BUTTON_SIZES = ['xs', 's', 'm'] as const;

export const Button: CatalogComponent = {
  name: 'Button',
  render: ({ props, rawProps, dispatchAction, accessibility }) => {
    const variant = oneOf(
      props.variant,
      ['default', 'primary', 'danger', 'borderless', 'icon'] as const,
      'default'
    );
    const label = str(props.label);
    const size = oneOf(props.size, BUTTON_SIZES, 'm');
    // Falls back to the colour the variant implies, so existing documents that
    // only set `variant` keep rendering exactly as before.
    const color = oneOf(props.color, BUTTON_COLORS, variant === 'danger' ? 'danger' : 'primary');

    const shared = {
      iconType: optionalStr(props.iconType),
      isDisabled: bool(props.disabled),
      onClick: () => dispatchAction(rawProps.action as Action | undefined),
    };

    if (variant === 'icon') {
      return (
        <EuiButtonIcon
          {...shared}
          iconType={optionalStr(props.iconType) ?? 'empty'}
          color={color}
          size={size}
          // `label` is schema-required, so an icon-only button always has an
          // accessible name even when the author forgot the accessibility block.
          aria-label={accessibility?.label ?? label}
        />
      );
    }

    const labelled = {
      ...shared,
      fullWidth: bool(props.fullWidth),
      'aria-label': accessibility?.label,
    };

    if (variant === 'borderless') {
      return (
        <EuiButtonEmpty {...labelled} color={color} size={size}>
          {label}
        </EuiButtonEmpty>
      );
    }

    return (
      <EuiButton
        {...labelled}
        fill={variant === 'primary'}
        color={color}
        // EuiButton has no 'xs'; the nearest it offers is 's'.
        size={size === 'm' ? 'm' : 's'}
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
      ['shortText', 'longText', 'number', 'obscured', 'search'] as const,
      'shortText'
    );
    const compressed = bool(props.compressed);

    const onChange = (next: string | number) => {
      if (path) setValue(path, next);
    };

    const shared = {
      id,
      value,
      disabled,
      compressed,
      placeholder: optionalStr(props.placeholder),
      'aria-label': accessibility?.label ?? str(props.label),
      fullWidth: true,
    };

    const control =
      variant === 'longText' ? (
        <EuiTextArea {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : variant === 'number' ? (
        <EuiFieldNumber
          {...shared}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      ) : variant === 'obscured' ? (
        <EuiFieldPassword {...shared} onChange={(e) => onChange(e.target.value)} />
      ) : variant === 'search' ? (
        <EuiFieldSearch
          {...shared}
          incremental
          isClearable
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <EuiFieldText {...shared} onChange={(e) => onChange(e.target.value)} />
      );

    // A toolbar search box has no room for a form row, and its label is already
    // carried as the input's accessible name.
    if (bool(props.hideLabel)) return control;

    return (
      <EuiFormRow
        label={str(props.label)}
        helpText={optionalStr(props.helpText)}
        fullWidth
        aria-describedby={accessibility?.description}
      >
        {control}
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

    const label = str(props.label);
    const value = str(props.value);
    const disabled = bool(props.disabled) || !path;
    const inline = bool(props.inline);
    const compressed = bool(props.compressed);
    const ariaLabel = accessibility?.label ?? label;
    // Inline controls sit in a toolbar row, where the label belongs inside the
    // control and full width would push everything else off the row.
    const shared = { compressed, fullWidth: !inline, prepend: inline ? label : undefined };

    const control = bool(props.searchable) ? (
      <EuiComboBox
        {...shared}
        id={id}
        singleSelection={{ asPlainText: true }}
        options={options.map((option) => ({ label: option.text, value: option.value }))}
        selectedOptions={options
          .filter((option) => option.value === value)
          .map((option) => ({ label: option.text, value: option.value }))}
        isDisabled={disabled}
        isClearable={false}
        placeholder={optionalStr(props.placeholder)}
        aria-label={ariaLabel}
        onChange={(selected) => path && setValue(path, str(selected[0]?.value))}
      />
    ) : (
      <EuiSelect
        {...shared}
        id={id}
        options={options}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => path && setValue(path, e.target.value)}
      />
    );

    if (inline) return control;

    return (
      <EuiFormRow label={label} fullWidth>
        {control}
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
