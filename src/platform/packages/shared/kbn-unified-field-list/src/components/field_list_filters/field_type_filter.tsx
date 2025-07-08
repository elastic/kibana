/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterButton,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPanel,
  EuiText,
  EuiLink,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiNotificationBadge,
  EuiIconTip,
  EuiButtonEmpty,
  useEuiTheme,
  EuiTitle,
  useGeneratedHtmlId,
  logicalCSS,
  UseEuiTheme,
  mathWithUnits,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import {
  type FieldTypeKnown,
  getFieldIconType,
  getFieldTypeDescription,
  getFieldTypeName,
  isKnownFieldType,
  KNOWN_FIELD_TYPE_LIST,
  FieldIcon,
} from '@kbn/field-utils';
import type { FieldListItem, GetCustomFieldType } from '../../types';

const EQUAL_HEIGHT_OFFSET = 2; // to avoid changes in the header's height after "Clear all" button appears
const popoverTitleStyle = css`
  padding: ${EQUAL_HEIGHT_OFFSET}px 0;
`;

const filterPopoverStyle = ({ euiTheme }: UseEuiTheme) => css`
  .euiFilterButton__wrapper {
    ${logicalCSS('left', `-${euiTheme.size.s}`)}
    ${logicalCSS('min-width', '0')}
    ${logicalCSS('width', `calc(100% + ${mathWithUnits(euiTheme.size.s, (x) => x * 2)})`)}

    &::before {
      display: none;
    }
  }
`;

const filterButtonStyle = ({ euiTheme }: UseEuiTheme) => css`
  padding: 0;

  &,
  & .euiFilterButton__text {
    min-width: 0;
    line-height: 1;
  }
`;

/**
 * Props for FieldTypeFilter component
 */
export interface FieldTypeFilterProps<T extends FieldListItem> {
  'data-test-subj': string;
  docLinks: CoreStart['docLinks'];
  allFields: T[] | null;
  getCustomFieldType?: GetCustomFieldType<T>;
  selectedFieldTypes: FieldTypeKnown[];
  onSupportedFieldFilter?: (field: T) => boolean;
  onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}

/**
 * A popover with field type filters
 * @param dataTestSubject
 * @param docLinks
 * @param allFields
 * @param getCustomFieldType
 * @param selectedFieldTypes
 * @param onSupportedFieldFilter
 * @param onChange
 * @constructor
 */
export function FieldTypeFilter<T extends FieldListItem = DataViewField>({
  'data-test-subj': dataTestSubject,
  docLinks,
  allFields,
  getCustomFieldType,
  selectedFieldTypes,
  onSupportedFieldFilter,
  onChange,
}: FieldTypeFilterProps<T>) {
  const testSubj = `${dataTestSubject}FieldTypeFilter`;

  // This id is used to describe the popover title from the menu for screen readers.
  const popoverTitleId = useGeneratedHtmlId({
    prefix: 'unifiedFieldList.fieldTypeFilter',
    suffix: 'popoverTitle',
  });

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [typeCounts, setTypeCounts] = useState<Map<string, number>>();

  const { euiTheme } = useEuiTheme();

  const titleStyle = useMemo(
    () => css`
      padding-top: calc(${euiTheme.size.m} - ${EQUAL_HEIGHT_OFFSET}px);
      padding-bottom: calc(${euiTheme.size.m} - ${EQUAL_HEIGHT_OFFSET}px);
      padding-left: ${euiTheme.size.m};
      padding-right: ${euiTheme.size.xs};
    `,
    [euiTheme.size.m, euiTheme.size.xs]
  );

  const itemStyle = useMemo(
    () => css`
      font-size: ${euiTheme.size.m};
      padding: ${euiTheme.size.s} ${euiTheme.size.m};

      & + & {
        border-top: 1px solid ${euiTheme.colors.lightestShade};
      }
    `,
    [euiTheme]
  );

  useEffect(() => {
    // calculate counts only if user opened the popover
    if (!isOpen || !allFields?.length) {
      setTypeCounts(undefined);
      return;
    }
    const counts = new Map();
    allFields.forEach((field) => {
      if (onSupportedFieldFilter && !onSupportedFieldFilter(field)) {
        return;
      }
      const type = getFieldIconType(field, getCustomFieldType);
      if (isKnownFieldType(type)) {
        counts.set(type, (counts.get(type) || 0) + 1);
      }
    });
    setTypeCounts(counts);
  }, [isOpen, allFields, setTypeCounts, getCustomFieldType, onSupportedFieldFilter]);

  const availableFieldTypes = useMemo(() => {
    // sorting is defined by items in KNOWN_FIELD_TYPE_LIST
    return KNOWN_FIELD_TYPE_LIST.filter((type) => {
      const knownTypeCount = typeCounts?.get(type) ?? 0;
      // always include current field type filters - there may not be any fields of the type of an existing type filter on data view switch, but we still need to include the existing filter in the list so that the user can remove it
      return knownTypeCount > 0 || selectedFieldTypes.includes(type);
    });
  }, [typeCounts, selectedFieldTypes]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <EuiPopover
      id="unifiedFieldTypeFilter"
      panelProps={{ css: { width: euiTheme.base * 18 } }}
      panelPaddingSize="none"
      anchorPosition="rightUp"
      display="block"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      css={filterPopoverStyle}
      button={
        <EuiFilterButton
          aria-label={i18n.translate('unifiedFieldList.fieldTypeFilter.filterByTypeAriaLabel', {
            defaultMessage: 'Filter by type',
          })}
          color="text"
          isSelected={isOpen}
          numFilters={selectedFieldTypes.length}
          hasActiveFilters={!!selectedFieldTypes.length}
          numActiveFilters={selectedFieldTypes.length}
          data-test-subj={`${testSubj}Toggle`}
          css={filterButtonStyle}
          onClick={() => setIsOpen((value) => !value)}
        >
          <EuiIcon type="filter" />
        </EuiFilterButton>
      }
    >
      <>
        <EuiPopoverTitle paddingSize="none">
          <EuiFlexGroup responsive={false} gutterSize="xs" css={titleStyle} alignItems="center">
            <EuiFlexItem css={popoverTitleStyle}>
              <EuiTitle size="xxs">
                <h5 id={popoverTitleId} className="eui-textBreakWord">
                  {i18n.translate('unifiedFieldList.fieldTypeFilter.title', {
                    defaultMessage: 'Filter by field type',
                  })}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            {selectedFieldTypes.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="xs" onClick={clearAll} data-test-subj={`${testSubj}ClearAll`}>
                  {i18n.translate('unifiedFieldList.fieldTypeFilter.clearAllLink', {
                    defaultMessage: 'Clear all',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPopoverTitle>
        {availableFieldTypes.length > 0 ? (
          <EuiContextMenuPanel
            data-test-subj={`${testSubj}Options`}
            role="menu"
            aria-labelledby={popoverTitleId}
            items={availableFieldTypes.map((type) => {
              const fieldTypeName = getFieldTypeName(type);
              const fieldTypeCount = typeCounts?.get(type) ?? 0;
              const isSelected = selectedFieldTypes.includes(type);

              return (
                <EuiContextMenuItem
                  aria-label={i18n.translate(
                    'unifiedFieldList.fieldTypeFilter.typeButtonAriaLabel',
                    {
                      defaultMessage: '{type} field count: {count}',
                      values: {
                        type: fieldTypeName,
                        count: fieldTypeCount,
                      },
                    }
                  )}
                  aria-checked={isSelected}
                  role="menuitemcheckbox"
                  key={type}
                  icon={isSelected ? 'check' : 'empty'}
                  data-test-subj={`typeFilter-${type}`}
                  css={itemStyle}
                  onClick={() => {
                    onChange(
                      selectedFieldTypes.includes(type)
                        ? selectedFieldTypes.filter((t) => t !== type)
                        : [...selectedFieldTypes, type]
                    );
                  }}
                >
                  <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <FieldIcon aria-hidden type={type} />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiText size="s">{fieldTypeName}</EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            aria-label={getFieldTypeDescription(type)}
                            type="question"
                            color="subdued"
                            content={getFieldTypeDescription(type)}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiNotificationBadge aria-hidden color="subdued" size="m">
                        {fieldTypeCount}
                      </EuiNotificationBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>
              );
            })}
          />
        ) : (
          <EuiFlexGroup responsive={false} alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiPanel color="transparent" paddingSize="l">
                <EuiLoadingSpinner />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiPopoverFooter>
          <EuiPanel color="transparent" paddingSize="m">
            <EuiText size="s">
              <p>
                {i18n.translate('unifiedFieldList.fieldTypeFilter.learnMoreText', {
                  defaultMessage: 'Learn more about',
                })}
                &nbsp;
                <EuiLink href={docLinks.links.discover.fieldTypeHelp} target="_blank" external>
                  <FormattedMessage
                    id="unifiedFieldList.fieldTypeFilter.fieldTypesDocLinkLabel"
                    defaultMessage="field types"
                  />
                </EuiLink>
              </p>
            </EuiText>
          </EuiPanel>
        </EuiPopoverFooter>
      </>
    </EuiPopover>
  );
}
