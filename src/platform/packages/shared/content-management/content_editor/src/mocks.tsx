/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { TagSelectorProps, SavedObjectsReference } from './services';

const tagsList = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'];

export const TagSelector = ({ initialSelection, onTagsSelected }: TagSelectorProps) => {
  const [selected, setSelected] = useState(initialSelection);

  const onTagClick = useCallback((tagId: string) => {
    setSelected((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  useEffect(() => {
    onTagsSelected(selected);
  }, [selected, onTagsSelected]);

  return (
    <div>
      <ul data-test-subj="tagSelector">
        {tagsList.map((tagId, i) => (
          <li key={i}>
            <button
              data-test-subj={`tag-${tagId}`}
              onClick={() => {
                onTagClick(tagId);
              }}
            >
              {tagId}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export interface TagListProps {
  references?: SavedObjectsReference[];
}

export const TagList = ({ references }: TagListProps) => {
  if (!references) {
    return null;
  }

  return (
    <ul data-test-subj="tagList">
      {references.map((tag) => (
        <li key={tag.name}>{tag.name}</li>
      ))}
    </ul>
  );
};
