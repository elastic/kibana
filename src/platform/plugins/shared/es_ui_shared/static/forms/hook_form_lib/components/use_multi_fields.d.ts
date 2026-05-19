import type { Props as UseFieldProps } from './use_field';
import type { FieldHook } from '../types';
interface Props<T> {
    fields: {
        [K in keyof T]: Exclude<UseFieldProps<T[K]>, 'children'>;
    };
    children: (fields: {
        [K in keyof T]: FieldHook<T[K]>;
    }) => JSX.Element | null;
}
/**
 * Use this component to avoid nesting multiple <UseField />
 *
 * @deprecated `hook_form_lib` is deprecated and will no longer be supported. Consider using
 * `react-hook-form` for new and existing forms.
 * @example
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
export declare function UseMultiFields<T = {
    [key: string]: unknown;
}>({ fields, children }: Props<T>): JSX.Element | null;
export {};
