/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { UseField, Props as UseFieldProps } from './use_field';
import { FieldHook } from '../types';

type FieldsArray = Array<{ id: string } & Omit<UseFieldProps<unknown, {}, unknown>, 'children'>>;

interface Props<T> {
  fields: { [K in keyof T]: Exclude<UseFieldProps<T[K]>, 'children'> };
  children: (fields: { [K in keyof T]: FieldHook<T[K]> }) => JSX.Element;
}

/**
 * Use this component to avoid nesting multiple <UseField />
  @example
```
// before
<UseField path="maxValue">
  {maxValueField => {
    return (
      <UseField path="minValue">
        {minValueField => {
          return (
            // The EuiDualRange handles 2 values (min and max) and thus
            // updates 2 fields in our form
            <EuiDualRange
              min={0}
              max={100}
              value={[minValueField.value, maxValueField.value]}
              onChange={([minValue, maxValue]) => {
                minValueField.setValue(minValue);
                maxValueField.setValue(maxValue);
              }}
            />
          )
        }}
      </UseField>
    )
  }}
</UseField>

// after
const fields = {
  min: {
    ... // any prop you would normally pass to <UseField />
    path: 'minValue',
    config: { ... } // FieldConfig
  },
  max: {
    path: 'maxValue',
  },
};

<UseMultiField fields={fields}>
  {({ min, max }) => {
    return (
      <EuiDualRange
        min={0}
        max={100}
        value={[min.value, max.value]}
        onChange={([minValue, maxValue]) => {
          min.setValue(minValue);
          max.setValue(maxValue);
        }}
      />
    );
  }}
</UseMultiField>
```
 */
export function UseMultiFields<T = { [key: string]: unknown }>({ fields, children }: Props<T>) {
  const fieldsArray = Object.entries(fields).reduce(
    (acc, [fieldId, field]) => [...acc, { id: fieldId, ...(field as FieldHook) }],
    [] as FieldsArray
  );

  const hookFields: { [K in keyof T]: FieldHook<any> } = {} as any;

  const renderField = (index: number) => {
    const { id } = fieldsArray[index];
    return (
      <UseField {...fields[id as keyof T]}>
        {(field) => {
          hookFields[id as keyof T] = field;
          return index === fieldsArray.length - 1 ? children(hookFields) : renderField(index + 1);
        }}
      </UseField>
    );
  };

  if (!Boolean(fieldsArray.length)) {
    return null;
  }

  return renderField(0);
}
