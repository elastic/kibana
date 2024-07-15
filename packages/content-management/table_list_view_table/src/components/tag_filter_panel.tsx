/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiTextColor,
  EuiSpacer,
  EuiLink,
  useEuiTheme,
  EuiPopoverFooter,
  EuiButton,
  EuiHealth,
  EuiBadge,
  Query,
  FieldValueOptionType,
} from '@elastic/eui';
import type { EuiSelectableProps, ExclusiveUnion } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';

import { useServices } from '../services';
import { Tag } from '../types';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

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
const modifierKeyPrefix = isMac ? '⌘' : '^';

const clearSelectionBtnCSS = css`
  height: auto;
`;

const saveBtnWrapperCSS = css`
  width: 100%;
`;

export interface Props {
  clearTagSelection: () => void;
  query: Query | null;
  tagsToTableItemMap: { [tagId: string]: string[] };
  getTagList: () => Tag[];
  addOrRemoveIncludeTagFilter: (tag: Tag) => void;
  addOrRemoveExcludeTagFilter: (tag: Tag) => void;
}

export const TagFilterPanel: FC<Props> = ({
  clearTagSelection,
  query,
  tagsToTableItemMap,
  getTagList,
  addOrRemoveIncludeTagFilter,
  addOrRemoveExcludeTagFilter,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const { navigateToUrl, currentAppId$, getTagManagementUrl } = useServices();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // When the panel is "in use" it means that it is opened and the user is interacting with it.
  // When the user clicks on a tag to select it, the component is unmounted and mounted immediately, which
  // creates a new EUI transition "IN" which makes the UI "flicker". To avoid that we pass this
  // "isInUse" state which disable the transition.
  const [isInUse, setIsInUse] = useState(false);
  const [options, setOptions] = useState<TagOptionItem[]>([]);
  const [tagSelection, setTagSelection] = useState<TagSelection>({});
  const totalActiveFilters = Object.keys(tagSelection).length;

  const isSearchVisible = options.length > 10;

  const searchBoxCSS = css`
    padding: ${euiTheme.size.s};
    border-bottom: ${euiTheme.border.thin};
  `;

  const popoverTitleCSS = css`
    height: ${euiTheme.size.xxxl};
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
      },
    };
  }

  const onSelectChange = useCallback(
    (updatedOptions: TagOptionItem[]) => {
      // Note: see data flow comment in useEffect() below
      const diff = updatedOptions.find((item, index) => item.checked !== options[index].checked);
      if (diff) {
        addOrRemoveIncludeTagFilter(diff.tag);
      }
    },
    [options, addOrRemoveIncludeTagFilter]
  );

  const onOptionClick = useCallback(
    (tag: Tag) => (e: MouseEvent) => {
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
                onClick={(e) => onOptionClick(tag)}
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

      // To avoid "cutting" the inflight css transition when opening the popover
      // we add a slight delay to switch the "isInUse" flag.
      setTimeout(() => {
        setIsInUse(true);
      }, 250);
    } else {
      setIsInUse(false);
    }
  }, [isPopoverOpen, updateTagList]);

  return (
    <>
      <EuiPopover
        button={
          <EuiFilterButton
            iconType="arrowDown"
            iconSide="right"
            onClick={onFilterButtonClick}
            data-test-subj="tagFilterPopoverButton"
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
        panelProps={{ css: { width: euiTheme.base * 18 } }}
        panelStyle={isInUse ? { transition: 'none' } : undefined}
      >
        <EuiPopoverTitle paddingSize="m" css={popoverTitleCSS}>
          <EuiFlexGroup>
            <EuiFlexItem>Tags</EuiFlexItem>
            <EuiFlexItem grow={false}>
              {totalActiveFilters > 0 && (
                <EuiButtonEmpty flush="both" onClick={clearTagSelection} css={clearSelectionBtnCSS}>
                  {i18n.translate(
                    'contentManagement.tableList.tagFilterPanel.clearSelectionButtonLabelLabel',
                    {
                      defaultMessage: 'Clear selection',
                    }
                  )}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiSelectable<any>
          singleSelection={false}
          aria-label="some aria label"
          options={options}
          renderOption={(option) => option.view}
          emptyMessage="There aren't any tags"
          noMatchesMessage="No tag matches the search"
          onChange={onSelectChange}
          data-test-subj="tagSelectableList"
          {...searchProps}
        >
          {(list, search) => {
            return (
              <>
                {isSearchVisible ? <div css={searchBoxCSS}>{search}</div> : <EuiSpacer size="s" />}
                {list}
              </>
            );
          }}
        </EuiSelectable>
        <EuiPopoverFooter paddingSize="m">
          <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="xs">
                <EuiTextColor color="dimgrey">
                  {i18n.translate(
                    'contentManagement.tableList.tagFilterPanel.modifierKeyHelpText',
                    {
                      defaultMessage: '{modifierKeyPrefix} + click exclude',
                      values: {
                        modifierKeyPrefix,
                      },
                    }
                  )}
                </EuiTextColor>
              </EuiText>
            </EuiFlexItem>

            <EuiFlexItem css={saveBtnWrapperCSS}>
              <EuiButton onClick={closePopover}>
                {i18n.translate('contentManagement.tableList.tagFilterPanel.doneButtonLabel', {
                  defaultMessage: 'Done',
                })}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem>
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
                      defaultMessage: 'Manage tags',
                    }
                  )}
                </EuiLink>
              </RedirectAppLinks>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </EuiPopover>
    </>
  );
};
