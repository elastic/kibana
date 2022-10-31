/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import type { TagSelectorProps } from './services';

export const TagSelector = ({ initialSelection, onTagsSelected }: TagSelectorProps) => {
  const [selected, setSelected] = useState(initialSelection);

  const onTagClick = (tagId: string) => {
    setSelected((prev) =>
      prev.includes(tagId) ? selected.filter((id) => id !== tagId) : [...selected, tagId]
    );
  };

  useEffect(() => {
    onTagsSelected(selected);
  }, [selected, onTagsSelected]);

  return (
    <div>
      <ul data-test-subj="tagSelection">
        {selected.map((tagId, i) => (
          <li key={i} data-test-subj={`tag-${tagId}`}>
            <button
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
