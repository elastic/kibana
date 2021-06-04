/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import VirtualList from 'react-tiny-virtual-list';

import { useFieldPreviewContext } from '../field_preview_context';
import { PreviewListItem } from './field_list_item';

import './field_list.scss';

export const ITEM_HEIGHT = 64;

export interface Field {
  key: string;
  value: string;
}

interface Props {
  fields: Field[];
  height: number;
}

export const PreviewFieldList: React.FC<Props> = ({ height, fields }) => {
  const {
    currentDocument: { value: currentDocument },
  } = useFieldPreviewContext();

  if (currentDocument === undefined || height === -1) {
    return null;
  }

  const listHeight = Math.min(fields.length * ITEM_HEIGHT, height);

  return (
    <VirtualList
      style={{ overflowX: 'hidden' }}
      width="100%"
      height={listHeight}
      itemCount={fields.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={4}
      renderItem={({ index, style }) => {
        const field = fields[index];

        return (
          <div key={field.key} style={style}>
            <PreviewListItem key={field.key} field={field} />
          </div>
        );
      }}
    />
  );
};
