/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import type { SavedObject, SavedObjectReference } from '@kbn/core/types';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { Tag, TagWithOptionalId } from '@kbn/tagging-core-plugin/common';

export interface TaggingUiPluginStart {
  components: {
    TagList: FunctionComponent<TagListComponentProps>;
    TagSelector: FunctionComponent<TagSelectorComponentProps>;
    SavedObjectSaveModalTagSelector: FunctionComponent<SavedObjectSaveModalTagSelectorComponentProps>;
  };
  utils: {
    getTagIdsFromReferences(references: SavedObjectReference[]): string[];
    convertNameToReference(tagName: string): { type: 'tag'; id: string } | undefined;
  };
}

export interface TagListComponentProps {
  object: { references: SavedObject['references'] };
  onClick?: (tag: TagWithOptionalId) => void;
  tagRender?: (tag: TagWithOptionalId) => JSX.Element;
}

export interface TagSelectorComponentProps {
  selected: string[];
  onTagsSelected: (ids: string[]) => void;
}

export type SavedObjectSaveModalTagSelectorComponentProps = EuiComboBoxProps<
  | Tag
  | {
      type: '__create_option__';
    }
> & {
  initialSelection: string[];
  onTagsSelected: (ids: string[]) => void;
  markOptional?: boolean;
};
