/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import {
  Query,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiTextColor,
  EuiHealth,
  EuiSpacer,
  EuiLink,
  useEuiTheme,
  EuiBadge,
} from '@elastic/eui';
import type { EuiSelectableProps, ExclusiveUnion, FieldValueOptionType } from '@elastic/eui';
import { css } from '@emotion/react';

import { Tag } from '../types';

const toArray = (item: unknown) => (Array.isArray(item) ? item : [item]);

const testSubjFriendly = (name: string) => {
  return name.replace(' ', '_');
};

interface TagOptionItem extends FieldValueOptionType {
  label: string;
  checked?: 'on' | 'off';
  tag: Tag;
}

export interface Props {
  query: Query | null;
  tagsToTableItemMap: { [tagId: string]: string[] };
  getTagList: () => Tag[];
  addOrRemoveIncludeTagFilter: (tag: Tag) => void;
  addOrRemoveExcludeTagFilter: (tag: Tag) => void;
}

export const TagFilterPanel: FC<Props> = ({
  query,
  getTagList,
  tagsToTableItemMap,
  addOrRemoveIncludeTagFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<TagOptionItem[]>([]);

  const isSearchVisible = options.length > 10;
  const totalActiveFilters = options.reduce((acc, option) => {
    if (option.checked !== undefined) {
      acc += 1;
    }
    return acc;
  }, 0);

  const footerCSS = css`
    border-top: ${euiTheme.border.thin};
    text-align: center;
  `;

  const bottomBarCSS = css`
    background-color: ${euiTheme.colors.lightestShade};
    border-top: ${euiTheme.border.thin};
    padding: ${euiTheme.size.s};
    text-align: center;
  `;

  let searchProps: ExclusiveUnion<
    { searchable: false },
    {
      searchable: true;
      searchProps: EuiSelectableProps['searchProps'];
    }
  > = {
    searchable: false,
  };

  if (isSearchVisible) {
    searchProps = {
      searchable: true,
      searchProps: {
        compressed: true,
        // disabled: this.state.error != null,
      },
    };
  }

  const togglePopOver = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const onSelectChange = useCallback(
    (updatedOptions: TagOptionItem[]) => {
      const diff = updatedOptions.find((item, index) => item.checked !== options[index].checked);
      if (diff) {
        addOrRemoveIncludeTagFilter(diff.tag);
      }
    },
    [options, addOrRemoveIncludeTagFilter]
  );

  const updateTagList = useCallback(() => {
    const tags = getTagList();

    setOptions(
      tags.map((tag) => {
        const { name, id, color } = tag;

        return {
          name,
          label: name,
          value: id,
          tag,
          view: (
            <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiHealth
                  color={color}
                  data-test-subj={`tag-searchbar-option-${testSubjFriendly(name)}`}
                >
                  <span>
                    <EuiText>{name}</EuiText>
                  </span>
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge>{tagsToTableItemMap[id]?.length ?? 0}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        };
      })
    );
  }, [getTagList, tagsToTableItemMap]);

  useEffect(() => {
    updateTagList();
  }, [updateTagList]);

  useEffect(() => {
    if (query) {
      const items: { [key: string]: TagOptionItem[] } = {
        on: [],
        off: [],
        rest: [],
      };

      const clauseInclude = query.ast.getOrFieldClause('tag', undefined, true, 'eq');
      const clausesExclude = query.ast.getOrFieldClause('tag', undefined, false, 'eq');

      setOptions((prev) => {
        prev.forEach((op) => {
          if (clauseInclude && toArray(clauseInclude.value).includes(op.name)) {
            items.on.push({ ...op, checked: 'on' as const });
          } else if (clausesExclude && toArray(clausesExclude.value).includes(op.name)) {
            items.on.push({ ...op, checked: 'off' as const });
          } else {
            items.on.push({ ...op, checked: undefined });
          }
        });

        return [...items.on, ...items.off, ...items.rest];
      });
    }
  }, [query]);

  return (
    <>
      <EuiPopover
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            onClick={togglePopOver}
            data-test-subj="tableSortSelectBtn"
            hasActiveFilters={totalActiveFilters > 0}
            numActiveFilters={totalActiveFilters}
            grow
          >
            Tags
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downCenter"
        panelClassName="euiFilterGroup__popoverPanel"
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiSelectable<any>
              singleSelection={false}
              aria-label="some aria label"
              options={options}
              renderOption={(option) => option.view}
              emptyMessage="There aren't any tags"
              noMatchesMessage="No tag matches the search"
              onChange={onSelectChange}
              {...searchProps}
            >
              {(list, search) => (
                <>
                  {isSearchVisible ? (
                    <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                  ) : (
                    <EuiSpacer size="s" />
                  )}
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiFlexItem>
          <EuiFlexItem css={footerCSS}>
            {totalActiveFilters > 0 ? (
              <EuiButtonEmpty iconType="crossInACircleFilled" color="danger">
                Clear selection
              </EuiButtonEmpty>
            ) : (
              <EuiSpacer size="s" />
            )}
            <EuiText size="xs">
              <EuiTextColor color="dimgrey">Ctrl + click to filter out tags</EuiTextColor>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={bottomBarCSS}>
            <span>
              <EuiLink href="https://elastic.co" external>
                Manage all tags
              </EuiLink>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </>
  );
};
