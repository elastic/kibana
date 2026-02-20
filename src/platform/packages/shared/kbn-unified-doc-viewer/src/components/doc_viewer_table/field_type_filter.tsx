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
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterButton,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiTitle,
  logicalCSS,
  mathWithUnits,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  FieldIcon,
  getFieldTypeDescription,
  getFieldTypeName,
  isKnownFieldType,
  KNOWN_FIELD_TYPE_LIST,
  type FieldTypeKnown,
} from '@kbn/field-utils';

const EQUAL_HEIGHT_OFFSET = 2; // keep header height stable when "Clear all" appears
const popoverTitleStyle = css`
  padding: ${EQUAL_HEIGHT_OFFSET}px 0;
`;

const filterPopoverStyle = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  .euiFilterButton__wrapper {
    ${logicalCSS('left', `-${euiTheme.size.s}`)}
    ${logicalCSS('min-width', '0')}
    ${logicalCSS('width', `calc(100% + ${mathWithUnits(euiTheme.size.s, (x) => x * 2)})`)}

    &::before {
      display: none;
    }
  }
`;

const filterButtonStyle = (euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']) => css`
  padding: 0;

  &,
  & .euiFilterButton__text {
    min-width: 0;
    line-height: 1;
  }
`;

export interface FieldTypeFilterFieldItem {
  name: string;
  displayName?: string;
  type?: FieldTypeKnown;
}

export interface FieldTypeFilterProps {
  'data-test-subj': string;
  docLinks: CoreStart['docLinks'];
  allFields: FieldTypeFilterFieldItem[] | null;
  selectedFieldTypes: FieldTypeKnown[];
  onChange: (fieldTypes: FieldTypeKnown[]) => unknown;
}

export function FieldTypeFilter({
  'data-test-subj': dataTestSubject,
  docLinks,
  allFields,
  selectedFieldTypes,
  onChange,
}: FieldTypeFilterProps) {
  const testSubj = `${dataTestSubject}FieldTypeFilter`;

  const popoverTitleId = useGeneratedHtmlId({
    prefix: 'unifiedDocViewer.fieldTypeFilter',
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
    if (!isOpen || !allFields?.length) {
      setTypeCounts(undefined);
      return;
    }

    const counts = new Map<string, number>();
    allFields.forEach((field) => {
      const type = field.type;
      if (!type || !isKnownFieldType(type)) {
        return;
      }
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    setTypeCounts(counts);
  }, [isOpen, allFields]);

  const availableFieldTypes = useMemo(() => {
    return KNOWN_FIELD_TYPE_LIST.filter((type) => {
      const knownTypeCount = typeCounts?.get(type) ?? 0;
      return knownTypeCount > 0 || selectedFieldTypes.includes(type);
    });
  }, [typeCounts, selectedFieldTypes]);

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <EuiPopover
      id="unifiedDocViewerFieldTypeFilter"
      panelProps={{ css: { width: euiTheme.base * 18 } }}
      panelPaddingSize="none"
      anchorPosition="rightUp"
      display="block"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      css={filterPopoverStyle(euiTheme)}
      button={
        <EuiFilterButton
          aria-label={i18n.translate('unifiedDocViewer.fieldTypeFilter.filterByTypeAriaLabel', {
            defaultMessage: 'Filter by type',
          })}
          color="text"
          isSelected={isOpen}
          numFilters={selectedFieldTypes.length}
          hasActiveFilters={Boolean(selectedFieldTypes.length)}
          numActiveFilters={selectedFieldTypes.length}
          data-test-subj={`${testSubj}Toggle`}
          css={filterButtonStyle(euiTheme)}
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
                  {i18n.translate('unifiedDocViewer.fieldTypeFilter.title', {
                    defaultMessage: 'Filter by field type',
                  })}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            {selectedFieldTypes.length > 0 && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="xs" onClick={clearAll} data-test-subj={`${testSubj}ClearAll`}>
                  <FormattedMessage
                    id="unifiedDocViewer.fieldTypeFilter.clearAllLabel"
                    defaultMessage="Clear all"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPopoverTitle>

        {typeCounts ? (
          <EuiContextMenuPanel
            aria-labelledby={popoverTitleId}
            items={availableFieldTypes.map((type) => {
              const fieldTypeName = getFieldTypeName(type);
              const fieldTypeCount = typeCounts.get(type) ?? 0;

              return (
                <EuiContextMenuItem
                  key={type}
                  size="s"
                  css={itemStyle}
                  icon={selectedFieldTypes.includes(type) ? 'check' : 'empty'}
                  data-test-subj={`${testSubj}Type-${type}`}
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
                {i18n.translate('unifiedDocViewer.fieldTypeFilter.learnMoreText', {
                  defaultMessage: 'Learn more about',
                })}
                &nbsp;
                <EuiLink href={docLinks.links.discover.fieldTypeHelp} target="_blank" external>
                  <FormattedMessage
                    id="unifiedDocViewer.fieldTypeFilter.fieldTypesDocLinkLabel"
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
