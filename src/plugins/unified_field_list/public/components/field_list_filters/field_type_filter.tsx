/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  useEuiTheme,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { FieldIcon } from '../field_icon';
import {
  getFieldIconType,
  getFieldTypeName,
  getFieldTypeDescription,
  isKnownFieldType,
  KNOWN_FIELD_TYPE_LIST,
} from '../../utils/field_types';
import type { FieldListItem, FieldTypeKnown, GetCustomFieldType } from '../../types';

export interface FieldTypeFilterProps<T extends FieldListItem> {
  docLinks: CoreStart['docLinks'];
  allFields: T[] | null;
  getCustomFieldType?: GetCustomFieldType<T>;
  selectedFieldTypes: FieldTypeKnown[];
  onSupportedFieldFilter?: (field: T) => boolean;
  onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}

// TODO: refactor test-subj and className

export function FieldTypeFilter<T extends FieldListItem = DataViewField>({
  docLinks,
  allFields,
  getCustomFieldType,
  selectedFieldTypes,
  onSupportedFieldFilter,
  onChange,
}: FieldTypeFilterProps<T>) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [typeCounts, setTypeCounts] = useState<Map<string, number>>();

  const { euiTheme } = useEuiTheme();

  const itemStyle = useMemo(
    () => css`
      padding: 0 ${euiTheme.size.xs};
    `,
    [euiTheme.size.xs]
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

  return (
    <EuiPopover
      id="unifiedFieldTypeFilter"
      panelClassName="euiFilterGroup__popoverPanel"
      panelPaddingSize="none"
      anchorPosition="rightUp"
      display="block"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiFilterButton
          aria-label={i18n.translate('unifiedFieldList.fieldTypeFilter.filterByTypeAriaLabel', {
            defaultMessage: 'Filter by type',
          })}
          color="primary"
          isSelected={isOpen}
          numFilters={selectedFieldTypes.length}
          hasActiveFilters={!!selectedFieldTypes.length}
          numActiveFilters={selectedFieldTypes.length}
          data-test-subj="lnsIndexPatternFiltersToggle"
          className="lnsFilterButton"
          onClick={() => setIsOpen((value) => !value)}
        >
          <EuiIcon type="filter" />
        </EuiFilterButton>
      }
    >
      <>
        <EuiPopoverTitle paddingSize="m">
          {i18n.translate('unifiedFieldList.fieldTypeFilter.title', {
            defaultMessage: 'Filter by field type',
          })}
        </EuiPopoverTitle>
        {availableFieldTypes.length > 0 ? (
          <EuiContextMenuPanel
            data-test-subj="lnsIndexPatternTypeFilterOptions"
            items={availableFieldTypes.map((type) => (
              <EuiContextMenuItem
                className="lnsInnerIndexPatternDataPanel__filterType"
                key={type}
                icon={selectedFieldTypes.includes(type) ? 'check' : 'empty'}
                data-test-subj={`typeFilter-${type}`}
                onClick={() => {
                  onChange(
                    selectedFieldTypes.includes(type)
                      ? selectedFieldTypes.filter((t) => t !== type)
                      : [...selectedFieldTypes, type]
                  );
                }}
              >
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" css={itemStyle}>
                  <EuiFlexItem grow={false}>
                    <FieldIcon type={type} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">{getFieldTypeName(type)}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          type="questionInCircle"
                          color="subdued"
                          content={getFieldTypeDescription(type)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="subdued" size="m">
                      {typeCounts?.get(type) ?? 0}
                    </EuiNotificationBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiContextMenuItem>
            ))}
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
                {i18n.translate('discover.fieldTypesPopover.learnMoreText', {
                  defaultMessage: 'Learn more about',
                })}
                &nbsp;
                <EuiLink href={docLinks.links.discover.fieldTypeHelp} target="_blank" external>
                  <FormattedMessage
                    id="discover.fieldTypesPopover.fieldTypesDocLinkLabel"
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
