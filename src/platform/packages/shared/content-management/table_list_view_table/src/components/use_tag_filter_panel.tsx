/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiHealth, EuiBadge } from '@elastic/eui';
import type { FieldValueOptionType, Query } from '@elastic/eui';
import { isMac } from '@kbn/shared-ux-utility';

import type { Tag } from '../types';

const toArray = (item: unknown) => (Array.isArray(item) ? item : [item]);

const testSubjFriendly = (name: string) => {
  return name.replace(' ', '_');
};

export interface TagSelection {
  [tagId: string]: 'include' | 'exclude' | undefined;
}

export interface TagOptionItem extends FieldValueOptionType {
  label: string;
  checked?: 'on' | 'off';
  tag: Tag;
}

export interface Params {
  query: Query | null;
  tagsToTableItemMap: { [tagId: string]: string[] };
  getTagList: () => Tag[];
  addOrRemoveIncludeTagFilter: (tag: Tag) => void;
  addOrRemoveExcludeTagFilter: (tag: Tag) => void;
}

export const useTagFilterPanel = ({
  query,
  tagsToTableItemMap,
  getTagList,
  addOrRemoveExcludeTagFilter,
  addOrRemoveIncludeTagFilter,
}: Params) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<TagOptionItem[]>([]);
  const [tagSelection, setTagSelection] = useState<TagSelection>({});
  const totalActiveFilters = Object.keys(tagSelection).length;

  const onSelectChange = useCallback(
    (updatedOptions: TagOptionItem[]) => {
      const diff = updatedOptions.find((item, index) => item.checked !== options[index].checked);
      if (diff) {
        addOrRemoveIncludeTagFilter(diff.tag);
      }
    },
    [addOrRemoveIncludeTagFilter, options]
  );

  const onOptionClick = useCallback(
    (tag: Tag) => (e: MouseEvent) => {
      // Make sure we don't trigger the default behavior of the EuiSelectable and onSelectChange isn't called
      e.stopPropagation();

      const withModifierKey = (isMac && e.metaKey) || (!isMac && e.ctrlKey);

      if (withModifierKey) {
        addOrRemoveExcludeTagFilter(tag);
      } else {
        addOrRemoveIncludeTagFilter(tag);
      }
    },
    [addOrRemoveIncludeTagFilter, addOrRemoveExcludeTagFilter]
  );

  const updateTagList = useCallback(() => {
    const tags = getTagList();

    const tagsToSelectOptions = tags.map((tag) => {
      const { name, id, color } = tag;
      let checked: 'on' | 'off' | undefined;

      if (tagSelection[name]) {
        checked = tagSelection[name] === 'include' ? 'on' : 'off';
      }

      return {
        name,
        label: name,
        value: id ?? '',
        tag,
        checked,
        view: (
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiHealth
                color={color}
                data-test-subj={`tag-searchbar-option-${testSubjFriendly(name)}`}
                onClick={onOptionClick(tag)}
              >
                <EuiText>{name}</EuiText>
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={checked !== undefined ? 'accent' : undefined}>
                {tagsToTableItemMap[id ?? '']?.length ?? 0}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });

    setOptions(tagsToSelectOptions);
  }, [getTagList, tagsToTableItemMap, tagSelection, onOptionClick]);

  const onFilterButtonClick = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  useEffect(() => {
    /**
     * Data flow for tag filter panel state:
     * When we click (or Ctrl + click) on a tag in the filter panel:
     * 1. The "onSelectChange()" handler is called
     * 2. It updates the Query in the parent component
     * 3. Which in turns update the search bar
     * 4. We receive the updated query back here
     * 5. The useEffect() executes and we check which tag is "included" or "excluded"
     * 6. We update the "tagSelection" state
     * 7. Which updates the "options" state (which is then passed to the stateless <TagFilterPanel />)
     */
    if (query) {
      const clauseInclude = query.ast.getOrFieldClause('tag', undefined, true, 'eq');
      const clauseExclude = query.ast.getOrFieldClause('tag', undefined, false, 'eq');

      const updatedTagSelection: TagSelection = {};

      if (clauseInclude) {
        toArray(clauseInclude.value).forEach((tagName) => {
          updatedTagSelection[tagName] = 'include';
        });
      }

      if (clauseExclude) {
        toArray(clauseExclude.value).forEach((tagName) => {
          updatedTagSelection[tagName] = 'exclude';
        });
      }

      setTagSelection(updatedTagSelection);
    }
  }, [query]);

  useEffect(() => {
    if (isPopoverOpen) {
      // Refresh the tag list whenever we open the pop over
      updateTagList();
    }
  }, [isPopoverOpen, updateTagList]);

  return {
    isPopoverOpen,
    options,
    totalActiveFilters,
    onFilterButtonClick,
    onSelectChange,
    closePopover,
  };
};
