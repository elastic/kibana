/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { useServices } from '../services';
import type { Tag } from '../types';

const toArray = (item: unknown) => (Array.isArray(item) ? item : [item]);

const testSubjFriendly = (name: string) => {
  return name.replace(' ', '_');
};

interface TagOptionItem extends FieldValueOptionType {
  label: string;
  checked?: 'on' | 'off';
  tag: Tag;
}

interface TagSelection {
  [tagId: string]: 'include' | 'exclude' | undefined;
}

export interface Props {
  query: Query | null;
  tagsToTableItemMap: { [tagId: string]: string[] };
  getTagList: () => Tag[];
  clearTagSelection: () => void;
  addOrRemoveIncludeTagFilter: (tag: Tag) => void;
  addOrRemoveExcludeTagFilter: (tag: Tag) => void;
}

export const TagFilterPanel: FC<Props> = ({
  query,
  getTagList,
  tagsToTableItemMap,
  clearTagSelection,
  addOrRemoveIncludeTagFilter,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<TagOptionItem[]>([]);
  const [tagSelection, setTagSelection] = useState<TagSelection>({});
  const { navigateToUrl, currentAppId$, getTagManagementUrl } = useServices();

  const isSearchVisible = options.length > 10;
  const totalActiveFilters = Object.keys(tagSelection).length;

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
    setIsPopoverOpen((prev) => {
      if (prev === false) {
        // Refresh the tag list whenever we open the pop over
        updateTagList();
      }
      return !prev;
    });
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
        let checked;
        if (tagSelection[name]) {
          checked = tagSelection[name] === 'include' ? ('on' as const) : ('off' as const);
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
                >
                  <span>
                    <EuiText>{name}</EuiText>
                  </span>
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
      })
    );
  }, [getTagList, tagsToTableItemMap, tagSelection]);

  useEffect(() => {
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
        <EuiFlexGroup direction="column" gutterSize="none">
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
            {totalActiveFilters > 0 && (
              <EuiButtonEmpty
                iconType="crossInACircleFilled"
                color="danger"
                onClick={clearTagSelection}
              >
                Clear selection
              </EuiButtonEmpty>
            )}
            <EuiSpacer size="s" />
            <EuiText size="xs">
              <EuiTextColor color="dimgrey">Ctrl + click to filter out tags</EuiTextColor>
            </EuiText>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem css={bottomBarCSS}>
            <span>
              <RedirectAppLinks
                coreStart={{
                  application: {
                    navigateToUrl,
                    currentAppId$,
                  },
                }}
              >
                <EuiLink href={getTagManagementUrl()} data-test-subj="manageAllTagsLink" external>
                  {i18n.translate(
                    'contentManagement.tableList.tagFilterPanel.manageAllTagsLinkLabel',
                    {
                      defaultMessage: 'Manage all tags',
                    }
                  )}
                </EuiLink>
              </RedirectAppLinks>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </>
  );
};
