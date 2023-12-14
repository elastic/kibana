/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useReducer } from 'react';

import type { FieldDefinition } from '@kbn/management-settings-types';
import { FieldCategories } from '@kbn/management-settings-components-field-category';
import { isEmpty } from 'lodash';
import { categorizeFields } from '@kbn/management-settings-utilities';
import { BottomBar } from './bottom_bar';
import { useSave } from './use_save';
import { ChangesDispatchProvider, changesReducer, initialChanges } from './changes_context';
import { UnsavedChange } from './types';

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

  const [unsavedChanges, dispatch] = useReducer(changesReducer, initialChanges);

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const unsavedChangesCount = unsavedChanges.length;
  const hasInvalidChanges = unsavedChanges.includes((el: UnsavedChange) => el.change.isInvalid);

  const clearAllUnsaved = () => {
    dispatch({ type: 'cleared' });
  };

  const saveChanges = useSave({ fields, clearChanges: clearAllUnsaved });

  const saveAll = async () => {
    setIsLoading(true);
    await saveChanges(unsavedChanges);
    setIsLoading(false);
  };

  const categorizedFields = categorizeFields(fields);

  return (
    <Fragment>
      <ChangesDispatchProvider {...{ dispatch }}>
        <FieldCategories
          {...{
            categorizedFields,
            categoryCounts,
            isSavingEnabled,
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
      </ChangesDispatchProvider>
    </Fragment>
  );
};
