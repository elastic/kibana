/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import type { FieldDefinition } from '@kbn/management-settings-types';
import { FieldRow, RowOnChangeFn } from '@kbn/management-settings-components-field-row';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { BottomBar } from './bottom_bar';
import { useServices } from './services';

/**
 * Props for a {@link Form} component.
 */
export interface FormProps {
  /** A list of {@link FieldDefinition} corresponding to settings to be displayed in the form. */
  fields: Array<FieldDefinition<SettingType>>;
  /** True if saving settings is enabled, false otherwise. */
  isSavingEnabled: boolean;
}

/**
 * Component for displaying a set of {@link FieldRow} in a form.
 * @param props The {@link FormProps} for the {@link Form} component.
 */
export const Form = (props: FormProps) => {
  const { fields, isSavingEnabled } = props;
  const { saveChanges, showError, showReloadPagePrompt } = useServices();

  const [unsavedChanges, setUnsavedChanges] = React.useState<
    Record<string, UnsavedFieldChange<SettingType>>
  >({});

  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const unsavedChangesCount = Object.keys(unsavedChanges).length;
  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  const saveAll = async () => {
    setIsLoading(true);
    if (isEmpty(unsavedChanges)) {
      return;
    }
    try {
      await saveChanges(unsavedChanges);
      clearAllUnsaved();
      const requiresReload = fields.some(
        (setting) => unsavedChanges.hasOwnProperty(setting.id) && setting.requiresPageReload
      );
      if (requiresReload) {
        showReloadPagePrompt();
      }
    } catch (e) {
      showError(
        i18n.translate('management.settings.form.saveErrorMessage', {
          defaultMessage: 'Unable to save',
        })
      );
    }
    setIsLoading(false);
  };

  const clearAllUnsaved = () => {
    setUnsavedChanges({});
  };

  const onChange: RowOnChangeFn<SettingType> = (id, change) => {
    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }

    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  const fieldRows = fields.map((field) => {
    const { id: key } = field;
    const unsavedChange = unsavedChanges[key];
    return <FieldRow {...{ key, field, unsavedChange, onChange, isSavingEnabled }} />;
  });

  return (
    <Fragment>
      <div>{fieldRows}</div>
      {!isEmpty(unsavedChanges) && (
        <BottomBar
          saveAll={saveAll}
          clearAllUnsaved={clearAllUnsaved}
          hasInvalidChanges={hasInvalidChanges}
          isLoading={isLoading}
          unsavedChangesCount={unsavedChangesCount}
        />
      )}
    </Fragment>
  );
};
