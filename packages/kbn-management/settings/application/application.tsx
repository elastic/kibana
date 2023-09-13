/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { FieldRow, RowOnChangeFn } from '@kbn/management-settings-components-field-row';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';

import { useFields } from './hooks/use_fields';

export interface SettingsApplicationProps {
  settingsStart: SettingsStart;
}

export const SettingsApplication = ({ settingsStart }: SettingsApplicationProps) => {
  const fields = useFields(settingsStart.client);

  const [unsavedChanges, setUnsavedChanges] = React.useState<
    Record<string, UnsavedFieldChange<SettingType>>
  >({});

  const onChange: RowOnChangeFn<SettingType> = (id, change) => {
    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }

    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  const isSavingEnabled = true;

  const fieldRows = fields.map((field) => {
    const { id: key } = field;
    const unsavedChange = unsavedChanges[key];

    return <FieldRow {...{ key, field, unsavedChange, onChange, isSavingEnabled }} />;
  });

  return <>{fieldRows}</>;
};
