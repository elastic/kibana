/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { get } from 'lodash';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext } from '../field_preview_context';
import { PreviewListItem } from './field_list_item';

import './field_list.scss';

export const PreviewFieldList = () => {
  const { indexPattern } = useFieldEditorContext();
  const {
    currentDocument: { value: currentDocument },
  } = useFieldPreviewContext();

  const fields = indexPattern.fields.getAll();
  const fieldsValues = fields
    .map((field) => ({
      key: field.displayName,
      value: JSON.stringify(get(currentDocument?._source, field.name)),
    }))
    .filter(({ value }) => value !== undefined);

  if (currentDocument === undefined) {
    return null;
  }

  return (
    <>
      {fieldsValues.map((field) => (
        <PreviewListItem key={field.key} field={field} />
      ))}
    </>
  );
};
