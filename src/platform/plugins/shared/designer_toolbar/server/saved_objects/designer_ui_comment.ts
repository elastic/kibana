/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const DESIGNER_UI_COMMENT_SAVED_OBJECT_TYPE = 'designer-toolbar-ui-comment';

export const designerUiComment: SavedObjectsType = {
  name: DESIGNER_UI_COMMENT_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'single',
  management: {
    icon: 'editorComment',
    defaultSearchField: 'text',
    importableAndExportable: true,
    getTitle: (obj) => {
      const text = obj.attributes.text as string | undefined;
      if (text?.trim()) {
        return text.trim().slice(0, 80);
      }
      return 'Designer annotation';
    },
  },
  mappings: {
    properties: {
      anchor: { type: 'keyword' },
      anchorType: { type: 'keyword' },
      relativeX: { type: 'float' },
      relativeY: { type: 'float' },
      context: { type: 'keyword' },
      text: { type: 'text' },
      author: { type: 'keyword' },
      createdAt: { type: 'date' },
      resolved: { type: 'boolean' },
      replies: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          text: { type: 'text' },
          author: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
      pathname: { type: 'keyword' },
      anchorLabel: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
};
