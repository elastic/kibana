/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
} from '@elastic/eui';
import type {
  FieldTemplateProps,
  ObjectFieldTemplateProps,
  RegistryWidgetsType,
  SubmitButtonProps,
  TemplatesType,
  UiSchema,
  WidgetProps,
} from '@rjsf/utils';
import { getSubmitButtonOptions } from '@rjsf/utils';
import type { JSONSchema7 } from 'json-schema';
import React from 'react';
import type {
  PAGE_UI_WIDGETS,
  PageInputs,
  PageUiField,
} from '@kbn/workflows/spec/schema/triggers/page_trigger_schema';

type PageUiWidget = (typeof PAGE_UI_WIDGETS)[number];

const isInvalid = (rawErrors?: string[]) => Boolean(rawErrors?.length);

const toText = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const TextWidget = ({
  id,
  value,
  placeholder,
  disabled,
  readonly,
  autofocus,
  rawErrors,
  options,
  onChange,
  onBlur,
  onFocus,
  type,
}: WidgetProps) => (
  <EuiFieldText
    id={id}
    type={type ?? 'text'}
    value={toText(value)}
    placeholder={placeholder}
    disabled={disabled || readonly}
    autoFocus={autofocus}
    isInvalid={isInvalid(rawErrors)}
    fullWidth
    onChange={(event) =>
      onChange(event.target.value === '' ? options.emptyValue : event.target.value)
    }
    onBlur={(event) => onBlur(id, event.target.value)}
    onFocus={(event) => onFocus(id, event.target.value)}
  />
);

const EmailWidget = (props: WidgetProps) => <TextWidget {...props} type="email" />;

const TextareaWidget = ({
  id,
  value,
  placeholder,
  disabled,
  readonly,
  autofocus,
  rawErrors,
  options,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps) => (
  <EuiTextArea
    id={id}
    value={toText(value)}
    placeholder={placeholder}
    disabled={disabled || readonly}
    autoFocus={autofocus}
    isInvalid={isInvalid(rawErrors)}
    rows={typeof options.rows === 'number' ? options.rows : 5}
    fullWidth
    onChange={(event) =>
      onChange(event.target.value === '' ? options.emptyValue : event.target.value)
    }
    onBlur={(event) => onBlur(id, event.target.value)}
    onFocus={(event) => onFocus(id, event.target.value)}
  />
);

const UpDownWidget = ({
  id,
  value,
  placeholder,
  disabled,
  readonly,
  rawErrors,
  options,
  onChange,
}: WidgetProps) => (
  <EuiFieldNumber
    id={id}
    value={typeof value === 'number' ? value : ''}
    placeholder={placeholder}
    disabled={disabled || readonly}
    isInvalid={isInvalid(rawErrors)}
    fullWidth
    onChange={(event) =>
      onChange(event.target.value === '' ? options.emptyValue : Number(event.target.value))
    }
  />
);

const RadioWidget = ({ id, value, disabled, readonly, options, onChange }: WidgetProps) => {
  const enumOptions = options.enumOptions ?? [];
  const selectedIndex = enumOptions.findIndex((option) => option.value === value);
  return (
    <EuiRadioGroup
      name={id}
      disabled={disabled || readonly}
      idSelected={selectedIndex >= 0 ? `${id}-${selectedIndex}` : undefined}
      options={enumOptions.map((option, index) => ({
        id: `${id}-${index}`,
        label: option.label,
      }))}
      onChange={(optionId) => {
        const index = Number(optionId.slice(id.length + 1));
        onChange(enumOptions[index]?.value);
      }}
    />
  );
};

const SelectWidget = ({
  id,
  label,
  value,
  disabled,
  readonly,
  rawErrors,
  options,
  onChange,
}: WidgetProps) => {
  const enumOptions = options.enumOptions ?? [];
  const selectedIndex = enumOptions.findIndex((option) => option.value === value);
  return (
    <EuiSelect
      id={id}
      aria-label={label}
      disabled={disabled || readonly}
      isInvalid={isInvalid(rawErrors)}
      hasNoInitialSelection
      fullWidth
      value={selectedIndex >= 0 ? String(selectedIndex) : ''}
      options={enumOptions.map((option, index) => ({ value: String(index), text: option.label }))}
      onChange={(event) =>
        onChange(
          event.target.value === ''
            ? options.emptyValue
            : enumOptions[Number(event.target.value)]?.value
        )
      }
    />
  );
};

const CheckboxWidget = ({ id, value, label, disabled, readonly, onChange }: WidgetProps) => (
  <EuiCheckbox
    id={id}
    label={label}
    checked={Boolean(value)}
    disabled={disabled || readonly}
    onChange={(event) => onChange(event.target.checked)}
  />
);

/** EUI switch. The row label shows the field title, so the switch repeats it only when alone. */
const ToggleWidget = ({
  id,
  value,
  label,
  hideLabel,
  disabled,
  readonly,
  onChange,
}: WidgetProps) => (
  <EuiSwitch
    id={id}
    label={label}
    showLabel={Boolean(hideLabel)}
    checked={Boolean(value)}
    disabled={disabled || readonly}
    onChange={(event) => onChange(event.target.checked)}
  />
);

export const pageWidgets: RegistryWidgetsType = {
  TextWidget,
  EmailWidget,
  TextareaWidget,
  UpDownWidget,
  RadioWidget,
  SelectWidget,
  CheckboxWidget,
  toggle: ToggleWidget,
};

type PageWidget = (props: WidgetProps) => JSX.Element;

/** The widget for each `ui:widget` name that a page YAML can use. */
const WIDGETS_BY_NAME: Record<PageUiWidget, PageWidget | undefined> = {
  text: TextWidget,
  textarea: TextareaWidget,
  email: EmailWidget,
  radio: RadioWidget,
  select: SelectWidget,
  checkbox: CheckboxWidget,
  toggle: ToggleWidget,
  hidden: undefined,
};

const isSelectSchema = (schema: JSONSchema7) =>
  Boolean(schema.enum?.length) ||
  Boolean(
    schema.oneOf?.length &&
      schema.oneOf.every((option) => typeof option === 'object' && 'const' in option)
  );

const defaultWidgetFor = (schema: JSONSchema7): PageWidget | undefined => {
  if (isSelectSchema(schema)) {
    return SelectWidget;
  }
  switch (schema.type) {
    case 'boolean':
      return CheckboxWidget;
    case 'number':
    case 'integer':
      return UpDownWidget;
    case 'string':
      return schema.format === 'email' ? EmailWidget : TextWidget;
    default:
      return undefined;
  }
};

const collectFields = (schema: PageInputs | undefined): Record<string, JSONSchema7> => {
  const fields: Record<string, JSONSchema7> = {
    ...((schema?.properties ?? {}) as Record<string, JSONSchema7>),
  };
  for (const rule of schema?.allOf ?? []) {
    for (const branch of [rule.then, rule.else]) {
      Object.assign(fields, (branch?.properties ?? {}) as Record<string, JSONSchema7>);
    }
  }
  return fields;
};

const withoutFormat = (properties: unknown) =>
  Object.fromEntries(
    Object.entries((properties ?? {}) as Record<string, JSONSchema7>).map(([name, field]) => {
      const { format, ...rest } = field;
      return [name, rest];
    })
  );

/**
 * Removes `format` from every field before RJSF sees the schema. For a field with a
 * `format`, RJSF looks up a widget by the format name, which hits the same `react-is`
 * crash as `withWidgetComponents` avoids. The validator keeps the full schema.
 */
export const toRenderSchema = (schema: PageInputs | undefined): PageInputs | undefined => {
  if (!schema) {
    return schema;
  }
  return {
    ...schema,
    properties: withoutFormat(schema.properties),
    allOf: schema.allOf?.map((rule) => ({
      ...rule,
      then: rule.then && { ...rule.then, properties: withoutFormat(rule.then.properties) },
      else: rule.else && { ...rule.else, properties: withoutFormat(rule.else.properties) },
    })),
  } as PageInputs;
};

/**
 * Sets `ui:widget` to a component for every field, root or conditional.
 *
 * RJSF resolves widget names with `react-is`, which comes from the Kibana shared-deps DLL
 * without a default export, so any widget name crashes. A component skips that lookup.
 */
export const withWidgetComponents = (schema: PageInputs | undefined, ui: UiSchema): UiSchema => {
  const resolved: UiSchema = { ...ui };
  for (const [name, fieldSchema] of Object.entries(collectFields(schema))) {
    const fieldUi = (ui[name] ?? {}) as PageUiField;
    const named = fieldUi['ui:widget'];
    if (named === 'hidden') {
      // eslint-disable-next-line no-continue
      continue;
    }
    const widget = named ? WIDGETS_BY_NAME[named] : defaultWidgetFor(fieldSchema);
    if (widget) {
      resolved[name] = { ...fieldUi, 'ui:widget': widget };
    }
  }
  return resolved;
};

const FieldTemplate = ({
  id,
  label,
  displayLabel,
  rawDescription,
  rawHelp,
  rawErrors,
  required,
  hidden,
  schema,
  children,
}: FieldTemplateProps) => {
  if (hidden) {
    return <div hidden>{children}</div>;
  }
  // Objects lay out their own fields; only leaf fields get a form row.
  if (schema.type === 'object') {
    return children;
  }
  const helpText = [rawDescription, rawHelp].filter(Boolean).join(' ');
  return (
    <EuiFormRow
      id={`${id}-row`}
      label={displayLabel ? `${label}${required ? ' *' : ''}` : undefined}
      helpText={helpText || undefined}
      isInvalid={isInvalid(rawErrors)}
      error={rawErrors}
      fullWidth
    >
      {children}
    </EuiFormRow>
  );
};

const ObjectFieldTemplate = ({ properties }: ObjectFieldTemplateProps) => (
  <EuiFlexGroup direction="column" gutterSize="m">
    {properties.map((property) => (
      <div key={property.name}>{property.content}</div>
    ))}
  </EuiFlexGroup>
);

const SubmitButton = ({ uiSchema }: SubmitButtonProps) => {
  const { norender, submitText } = getSubmitButtonOptions(uiSchema);
  if (norender) {
    return null;
  }
  return (
    <>
      <EuiSpacer size="l" />
      <EuiButton type="submit" fill data-test-subj="workflowPageSubmit">
        {submitText}
      </EuiButton>
    </>
  );
};

export const pageTemplates: Partial<TemplatesType> = {
  FieldTemplate,
  ObjectFieldTemplate,
  ButtonTemplates: { SubmitButton } as TemplatesType['ButtonTemplates'],
};
