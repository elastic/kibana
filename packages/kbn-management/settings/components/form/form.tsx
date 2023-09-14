/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import type { FieldDefinition } from '@kbn/management-settings-types';
import { FieldRow, OnChangeFn } from '@kbn/management-settings-components-field-row';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import { BottomBar } from './bottom_bar';

export interface FormProps {
  fields: Array<FieldDefinition<SettingType>>;
  save: (changes: Record<string, UnsavedFieldChange<SettingType>>) => void;
}

export const Form = (props: FormProps) => {
  const { fields, save } = props;

  const [unsavedChanges, setUnsavedChanges] = React.useState<
    Record<string, UnsavedFieldChange<SettingType>>
  >({});

  const onChange: OnChangeFn<SettingType> = (id, change) => {
    if (!change?.unsavedValue) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }

    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  const isSavingEnabled = true;

  const clearAllUnsaved = () => {
    setUnsavedChanges({});
  };

  const saveAll = async () => {
    if (isEmpty(unsavedChanges)) {
      return;
    }
    await save(unsavedChanges);
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
        <BottomBar saveAll={saveAll} clearAllUnsaved={clearAllUnsaved} />
      )}
    </Fragment>
  );
};
