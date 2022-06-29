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
import { useFieldPreviewContext } from '../preview';
import { UseArray, UseField, TextField } from '../../shared_imports';
import { TypeField } from './form_fields';

export const CompositeEditor = ({}) => {
  const { links, existingConcreteFields } = useFieldEditorContext();
  const { fields } = useFieldPreviewContext();
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
        {() => {
          return (
            <>
              {fields
                .filter(({ value }) => value !== undefined)
                .map((item, idx) => (
                  <div>
                    {item.key}
                    <UseField
                      path={`fields[${idx}].name`}
                      config={{ label: `${item.key}` }}
                      component={TextField}
                      style={{ display: 'none' }}
                    />
                    <TypeField path={`fields[${idx}].type`} />
                  </div>
                ))}
            </>
          );
        }}
      </UseArray>
    </div>
  );
};
