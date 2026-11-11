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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiCheckboxGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type {
  ArrayFieldTemplateProps,
  FieldTemplateProps,
  IconButtonProps,
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
import { i18n } from '@kbn/i18n';
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

/** A multiple-choice list: an array whose items are an enum or `oneOf` consts. */
const CheckboxesWidget = ({ id, value, options, disabled, readonly, onChange }: WidgetProps) => {
  const selected = new Set(Array.isArray(value) ? value.map(toText) : []);
  const choices = (options.enumOptions ?? []) as Array<{ label: string; value: unknown }>;
  return (
    <EuiCheckboxGroup
      idSelected={Object.fromEntries(
        choices.map((choice, index) => [`${id}-${index}`, selected.has(toText(choice.value))])
      )}
      options={choices.map((choice, index) => ({ id: `${id}-${index}`, label: choice.label }))}
      disabled={disabled || readonly}
      onChange={(optionId) => {
        const index = Number(optionId.slice(id.length + 1));
        const choice = choices[index];
        if (!choice) {
          return;
        }
        const next = selected.has(toText(choice.value))
          ? choices.filter((c) => c !== choice && selected.has(toText(c.value)))
          : choices.filter((c) => c === choice || selected.has(toText(c.value)));
        onChange(next.map((c) => c.value));
      }}
    />
  );
};

export const pageWidgets: RegistryWidgetsType = {
  TextWidget,
  EmailWidget,
  TextareaWidget,
  UpDownWidget,
  RadioWidget,
  SelectWidget,
  CheckboxWidget,
  CheckboxesWidget,
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

/** Drops `format` from a field and from the fields inside it. */
const stripFormat = (field: JSONSchema7): JSONSchema7 => {
  const { format, ...rest } = field;
  const { items } = rest;
  return {
    ...rest,
    ...(rest.properties ? { properties: withoutFormat(rest.properties) } : {}),
    ...(items && typeof items === 'object' && !Array.isArray(items)
      ? { items: stripFormat(items) }
      : {}),
  };
};

const withoutFormat = (properties: unknown) =>
  Object.fromEntries(
    Object.entries((properties ?? {}) as Record<string, JSONSchema7>).map(([name, field]) => [
      name,
      typeof field === 'object' ? stripFormat(field) : field,
    ])
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

const isChoiceList = (schema: JSONSchema7): boolean => {
  const { items } = schema;
  return (
    schema.type === 'array' &&
    Boolean(items) &&
    typeof items === 'object' &&
    !Array.isArray(items) &&
    isSelectSchema(items)
  );
};

/** Resolves the widget of one field, and of the fields inside an object or an array item. */
const withFieldWidgets = (fieldSchema: JSONSchema7, fieldUi: UiSchema): UiSchema => {
  const named = (fieldUi as PageUiField)['ui:widget'];
  if (named === 'hidden') {
    return fieldUi;
  }
  if (isChoiceList(fieldSchema)) {
    return { ...fieldUi, 'ui:widget': CheckboxesWidget };
  }
  if (fieldSchema.type === 'object' && fieldSchema.properties) {
    const nested: UiSchema = { ...fieldUi };
    for (const [name, child] of Object.entries(fieldSchema.properties)) {
      if (typeof child === 'object') {
        nested[name] = withFieldWidgets(child, (fieldUi[name] ?? {}) as UiSchema);
      }
    }
    return nested;
  }
  const { items } = fieldSchema;
  if (fieldSchema.type === 'array' && items && typeof items === 'object' && !Array.isArray(items)) {
    return { ...fieldUi, items: withFieldWidgets(items, (fieldUi.items ?? {}) as UiSchema) };
  }
  const widget = named ? WIDGETS_BY_NAME[named] : defaultWidgetFor(fieldSchema);
  return widget ? { ...fieldUi, 'ui:widget': widget } : fieldUi;
};

/**
 * Sets `ui:widget` to a component for every field: root, conditional, nested in an object,
 * or inside an array item.
 *
 * RJSF resolves widget names with `react-is`, which comes from the Kibana shared-deps DLL
 * without a default export, so any widget name crashes. A component skips that lookup.
 */
export const withWidgetComponents = (schema: PageInputs | undefined, ui: UiSchema): UiSchema => {
  const resolved: UiSchema = { ...ui };
  for (const [name, fieldSchema] of Object.entries(collectFields(schema))) {
    resolved[name] = withFieldWidgets(fieldSchema, (ui[name] ?? {}) as UiSchema);
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
  // RJSF hides the label of a list of objects, but the list needs its name above it.
  const showLabel = displayLabel || schema.type === 'array';
  return (
    <EuiFormRow
      id={`${id}-row`}
      label={showLabel ? `${label}${required ? ' *' : ''}` : undefined}
      helpText={helpText || undefined}
      isInvalid={isInvalid(rawErrors)}
      error={rawErrors}
      fullWidth
    >
      {children}
    </EuiFormRow>
  );
};

const ObjectFieldTemplate = ({
  properties,
  title,
  description,
  idSchema,
}: ObjectFieldTemplateProps) => {
  const fields = (
    <EuiFlexGroup direction="column" gutterSize="m">
      {properties.map((property) => (
        <div key={property.name}>{property.content}</div>
      ))}
    </EuiFlexGroup>
  );
  // The page draws the root heading. A nested object gets a titled group.
  if (idSchema.$id === 'root' || (!title && !description)) {
    return fields;
  }
  return (
    <EuiPanel hasBorder paddingSize="m">
      {title && (
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      )}
      {description && (
        <EuiText size="xs" color="subdued">
          <p>{description}</p>
        </EuiText>
      )}
      <EuiSpacer size="s" />
      {fields}
    </EuiPanel>
  );
};

const moveUpLabel = i18n.translate('workflows.pages.array.moveUp', { defaultMessage: 'Move up' });
const moveDownLabel = i18n.translate('workflows.pages.array.moveDown', {
  defaultMessage: 'Move down',
});
const copyLabel = i18n.translate('workflows.pages.array.copy', { defaultMessage: 'Copy item' });
const removeLabel = i18n.translate('workflows.pages.array.remove', {
  defaultMessage: 'Remove item',
});

interface IconActionProps {
  iconType: string;
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  isDisabled?: boolean;
  color?: 'danger';
}

/** An icon button with its label as a tooltip. */
const IconAction = ({ iconType, label, onClick, isDisabled, color }: IconActionProps) => (
  <EuiToolTip content={label} disableScreenReaderOutput>
    <EuiButtonIcon
      iconType={iconType}
      aria-label={label}
      color={color}
      isDisabled={isDisabled}
      onClick={onClick}
    />
  </EuiToolTip>
);

/**
 * A list: each item in a row with its own buttons, then an Add button. An object item draws
 * its own bordered group. The field row
 * around it already shows the label, description, and errors.
 */
const ArrayFieldTemplate = ({
  items,
  canAdd,
  onAddClick,
  disabled,
  readonly,
}: ArrayFieldTemplateProps) => (
  <EuiFlexGroup direction="column" gutterSize="s">
    {items.map((item) => (
      <div key={item.key}>
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>{item.children}</EuiFlexItem>
          {item.hasToolbar && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                {(item.hasMoveUp || item.hasMoveDown) && (
                  <>
                    <IconAction
                      iconType="chevronSingleUp"
                      label={moveUpLabel}
                      isDisabled={item.disabled || item.readonly || !item.hasMoveUp}
                      onClick={item.onReorderClick(item.index, item.index - 1)}
                    />
                    <IconAction
                      iconType="chevronSingleDown"
                      label={moveDownLabel}
                      isDisabled={item.disabled || item.readonly || !item.hasMoveDown}
                      onClick={item.onReorderClick(item.index, item.index + 1)}
                    />
                  </>
                )}
                {item.hasCopy && (
                  <IconAction
                    iconType="copy"
                    label={copyLabel}
                    isDisabled={item.disabled || item.readonly}
                    onClick={item.onCopyIndexClick(item.index)}
                  />
                )}
                {item.hasRemove && (
                  <IconAction
                    iconType="trash"
                    color="danger"
                    label={removeLabel}
                    isDisabled={item.disabled || item.readonly}
                    onClick={item.onDropIndexClick(item.index)}
                  />
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    ))}
    {canAdd && (
      <div>
        <EuiButtonEmpty
          iconType="plus"
          size="s"
          flush="left"
          onClick={onAddClick}
          isDisabled={disabled || readonly}
          data-test-subj="workflowPageArrayAdd"
        >
          {i18n.translate('workflows.pages.array.add', { defaultMessage: 'Add item' })}
        </EuiButtonEmpty>
      </div>
    )}
  </EuiFlexGroup>
);

/** EUI icon buttons for the places RJSF draws them outside a list, such as extra properties. */
const iconButton =
  (iconType: string, label: string) =>
  ({ onClick, disabled }: IconButtonProps) =>
    (
      <IconAction
        iconType={iconType}
        label={label}
        isDisabled={disabled}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      />
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
  ArrayFieldTemplate,
  ButtonTemplates: {
    SubmitButton,
    AddButton: iconButton(
      'plus',
      i18n.translate('workflows.pages.array.addIcon', { defaultMessage: 'Add' })
    ),
    RemoveButton: iconButton('trash', removeLabel),
    MoveUpButton: iconButton('chevronSingleUp', moveUpLabel),
    MoveDownButton: iconButton('chevronSingleDown', moveDownLabel),
    CopyButton: iconButton('copy', copyLabel),
  } as TemplatesType['ButtonTemplates'],
};
