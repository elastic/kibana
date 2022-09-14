/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { map, bufferCount, filter, BehaviorSubject } from 'rxjs';
import { differenceWith, isEqual } from 'lodash';

import { ValidationFunc, FieldConfig } from '../../shared_imports';
import type { Field } from '../../types';
import type { Context } from '../field_editor_context';
import { schema } from './form_schema';
import type { Props } from './field_editor';
import { RUNTIME_FIELD_OPTIONS_PRIMITIVE } from './constants';
import { ChangeType, FieldPreview } from '../preview/types';

import { RuntimePrimitiveTypes } from '../../shared_imports';

export interface Change {
  changeType: ChangeType;
  type?: RuntimePrimitiveTypes;
}

export type ChangeSet = Record<string, Change>;

const createNameNotAllowedValidator =
  (namesNotAllowed: Context['namesNotAllowed']): ValidationFunc<{}, string, string> =>
  ({ value }) => {
    if (namesNotAllowed.fields.includes(value)) {
      return {
        message: i18n.translate(
          'indexPatternFieldEditor.editor.runtimeFieldsEditor.existRuntimeFieldNamesValidationErrorMessage',
          {
            defaultMessage: 'A field with this name already exists.',
          }
        ),
      };
    } else if (namesNotAllowed.runtimeComposites.includes(value)) {
      return {
        message: i18n.translate(
          'indexPatternFieldEditor.editor.runtimeFieldsEditor.existCompositeNamesValidationErrorMessage',
          {
            defaultMessage: 'A runtime composite with this name already exists.',
          }
        ),
      };
    }
  };

/**
 * Dynamically retrieve the config for the "name" field, adding
 * a validator to avoid duplicated runtime fields to be created.
 *
 * @param namesNotAllowed Array of names not allowed for the field "name"
 * @param field Initial value of the form
 */
export const getNameFieldConfig = (
  namesNotAllowed?: Context['namesNotAllowed'],
  field?: Props['field']
): FieldConfig<string, Field> => {
  const nameFieldConfig = schema.name as FieldConfig<string, Field>;

  if (!namesNotAllowed) {
    return nameFieldConfig;
  }

  const filterOutCurrentFieldName = (name: string) => name !== field?.name;

  // Add validation to not allow duplicates
  return {
    ...nameFieldConfig!,
    validations: [
      ...(nameFieldConfig.validations ?? []),
      {
        validator: createNameNotAllowedValidator({
          fields: namesNotAllowed.fields.filter(filterOutCurrentFieldName),
          runtimeComposites: namesNotAllowed.runtimeComposites.filter(filterOutCurrentFieldName),
        }),
      },
    ],
  };
};

export const valueToComboBoxOption = (value: string) =>
  RUNTIME_FIELD_OPTIONS_PRIMITIVE.find(({ value: optionValue }) => optionValue === value);

export const getFieldPreviewChanges = (subject: BehaviorSubject<FieldPreview[] | undefined>) =>
  subject.pipe(
    filter((preview) => preview !== undefined),
    map((items) =>
      // reduce the fields to make diffing easier
      items!.map((item) => {
        const key = item.key.slice(item.key.search('\\.') + 1);
        return { name: key, type: item.type! };
      })
    ),
    bufferCount(2, 1),
    // convert values into diff descriptions
    map(([prev, next]) => {
      const changes = differenceWith(next, prev, isEqual).reduce<ChangeSet>((col, item) => {
        col[item.name] = {
          changeType: ChangeType.UPSERT,
          type: item.type as RuntimePrimitiveTypes,
        };
        return col;
      }, {} as ChangeSet);

      prev.forEach((prevItem) => {
        if (!next.find((nextItem) => nextItem.name === prevItem.name)) {
          changes[prevItem.name] = { changeType: ChangeType.DELETE };
        }
      });
      return changes;
    }),
    filter((fields) => Object.keys(fields).length > 0)
  );
