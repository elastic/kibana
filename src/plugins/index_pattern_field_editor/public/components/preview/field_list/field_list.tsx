/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo } from 'react';
import VirtualList from 'react-tiny-virtual-list';
import { get } from 'lodash';

import { useFieldEditorContext } from '../../field_editor_context';
import { useFieldPreviewContext } from '../field_preview_context';
import { PreviewListItem } from './field_list_item';

import './field_list.scss';

const ITEM_HEIGHT = 64;

export const PreviewFieldList = () => {
  const { indexPattern } = useFieldEditorContext();
  const {
    currentDocument: { value: currentDocument },
  } = useFieldPreviewContext();

  const {
    fields: { getAll: getAllFields },
  } = indexPattern;

  const fields = useMemo(() => {
    return getAllFields();
  }, [getAllFields]);

  const fieldsValues = useMemo(
    () =>
      fields
        .map((field) => ({
          key: field.displayName,
          value: JSON.stringify(get(currentDocument?._source, field.name)),
        }))
        .filter(({ value }) => value !== undefined),
    [fields, currentDocument?._source]
  );

  if (currentDocument === undefined) {
    return null;
  }

  const listHeight = Math.min(fieldsValues.length * ITEM_HEIGHT, 600);

  return (
    <VirtualList
      style={{ overflowX: 'hidden' }}
      width="100%"
      height={listHeight}
      itemCount={fieldsValues.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={4}
      renderItem={({ index, style }) => {
        const item = fieldsValues[index];

        return (
          <div key={item.key} style={style}>
            <PreviewListItem key={item.key} field={item} />
          </div>
        );
      }}
    />
  );
};
