/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';

import { Props as UseFieldProps } from './use_field';
import { useFieldFromProps } from '../hooks';
import { FieldHook } from '../types';

interface Props<T> {
  fields: { [K in keyof T]: Exclude<UseFieldProps<T[K]>, 'children'> };
  children: (fields: { [K in keyof T]: FieldHook<T[K]> }) => JSX.Element | null;
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

<UseMultiFields fields={fields}>
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
</UseMultiFields>
```
 */
export function UseMultiFields<T = { [key: string]: unknown }>({ fields, children }: Props<T>) {
  // Create a stable reference of fields Ids to prevent creating more fields
  // by changing the "fields" prop. This is not allowed as it would break
  // the hook order below.
  const fieldIds = useRef(Object.keys(fields).sort() as Array<keyof T>);

  const hookFields = fieldIds.current.reduce((acc, id) => {
    // We can disable the rules-of-hooks that prevents us to create a hook
    // from inside a callback as we have the **guarantee** that the field hooks are created
    // in the same order.

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { field } = useFieldFromProps(fields[id]);
    return {
      ...acc,
      [id]: field,
    };
  }, {} as { [K in keyof T]: FieldHook<T[K]> });

  if (!Boolean(fieldIds.current.length)) {
    return null;
  }

  return children(hookFields);
}
