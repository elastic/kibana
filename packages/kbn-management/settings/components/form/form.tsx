/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import type { FieldDefinition } from '@kbn/management-settings-types';
import { FieldCategories } from '@kbn/management-settings-components-field-category';
import { UnsavedFieldChange, OnFieldChangeFn } from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import { categorizeFields } from '@kbn/management-settings-utilities';
import { BottomBar } from './bottom_bar';
import { useSave } from './use_save';

/**
 * Props for a {@link Form} component.
 */
export interface FormProps {
  /** A list of {@link FieldDefinition} corresponding to settings to be displayed in the form. */
  fields: FieldDefinition[];
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
  /** Contains the number of registered settings in each category. */
  categoryCounts: { [category: string]: number };
  /** Handler for the "clear search" link. */
  onClearQuery: () => void;
}

/**
 * Component for displaying a set of {@link FieldRow} in a form.
 * @param props The {@link FormProps} for the {@link Form} component.
 */
export const Form = (props: FormProps) => {
  const { fields, isSavingEnabled, categoryCounts, onClearQuery } = props;

  const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
    {}
  );

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const unsavedChangesCount = Object.keys(unsavedChanges).length;
  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  const clearAllUnsaved = () => {
    setUnsavedChanges({});
  };

  const saveChanges = useSave({ fields, clearChanges: clearAllUnsaved });

  const saveAll = async () => {
    setIsLoading(true);
    await saveChanges(unsavedChanges);
    setIsLoading(false);
  };

  const onFieldChange: OnFieldChangeFn = (id, change) => {
    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }

    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  const categorizedFields = categorizeFields(fields);

  return (
    <Fragment>
      <FieldCategories
        {...{
          categorizedFields,
          categoryCounts,
          isSavingEnabled,
          onFieldChange,
          onClearQuery,
          unsavedChanges,
        }}
      />
      {!isEmpty(unsavedChanges) && (
        <BottomBar
          onSaveAll={saveAll}
          onClearAllUnsaved={clearAllUnsaved}
          hasInvalidChanges={hasInvalidChanges}
          isLoading={isLoading}
          unsavedChangesCount={unsavedChangesCount}
        />
      )}
    </Fragment>
  );
};
