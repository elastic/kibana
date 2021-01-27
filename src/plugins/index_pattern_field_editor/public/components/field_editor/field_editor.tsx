/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import React from 'react';

import { FormHook } from '../../shared_imports';
import { Field } from '../../types';

export interface FieldEditorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  submit: FormHook<Field>['submit'];
}

export interface Props {
  /** Link URLs to our doc site */
  links: {
    runtimePainless: string;
  };
  /** Optional field to edit */
  field?: Field;
  /** Handler to receive state changes updates */
  onChange?: (state: FieldEditorFormState) => void;
  /** Optional context object */
  ctx?: {
    /**
     * An array of field names not allowed.
     * e.g we probably don't want a user to give a name of an existing
     * runtime field (for that the user should edit the existing runtime field).
     */
    namesNotAllowed?: string[];
    /**
     * An array of existing concrete fields. If the user gives a name to the runtime
     * field that matches one of the concrete fields, a callout will be displayed
     * to indicate that this runtime field will shadow the concrete field.
     * It is also used to provide the list of field autocomplete suggestions to the code editor.
     */
    existingConcreteFields?: Field[];
  };
}

const FieldEditorComponent = (props: Props) => {
  return <div>Placeholder for the future field editor</div>;
};

export const FieldEditor = React.memo(FieldEditorComponent);
