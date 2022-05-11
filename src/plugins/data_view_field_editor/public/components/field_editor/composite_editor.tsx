/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ScriptField } from './form_fields';
import { useFieldEditorContext } from '../field_editor_context';
// import { useFieldPreviewContext } from '../preview';
import { UseArray, UseField, TextField } from '../../shared_imports';

export const CompositeEditor = ({}) => {
  const { links, existingConcreteFields } = useFieldEditorContext();
  // const { fields } = useFieldPreviewContext();
  // const names = fields.map((field) => field.key);
  // console.log('fields from context', fields);
  // what I want to do -
  // 1. get list of fields
  // 2. get types from `fields` in context

  return (
    <div>
      <ScriptField existingConcreteFields={existingConcreteFields} links={links} />
      <UseArray path="fields">
        {({ items, form }) => {
          // to do, provide type, no initial item
          // console.log('within useArray', form.getFormData());
          const fieldNames = Object.keys(form.getFormData()?.fields || {});
          return (
            <>
              {items
                .filter(({ isNew }) => !isNew)
                .map((item, idx) => (
                  <div>
                    <UseField
                      path={`fields[${idx}].name`}
                      config={{ label: `${item.path}.name` }}
                      component={TextField}
                      // Make sure to add this prop otherwise when you delete
                      // a row and add a new one, the stale values will appear
                      readDefaultValueOnForm={!item.isNew}
                      style={{ display: 'none' }}
                    />
                    <UseField
                      path={`fields[${idx}].type`}
                      config={{ label: fieldNames[idx] }}
                      component={TextField}
                      // Make sure to add this prop otherwise when you delete
                      // a row and add a new one, the stale values will appear
                      readDefaultValueOnForm={!item.isNew}
                    />
                  </div>
                ))}
            </>
          );
        }}
      </UseArray>
    </div>
  );
};
