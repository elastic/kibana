/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiLink,
  EuiText,
  useEuiTheme,
  EuiFieldSearch,
  EuiComboBox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DocumentationNavProps {
  searchText: string;
  setSearchText: (text: string) => void;
  onNavigationChange: (selectedOptions: Array<{ label: string }>) => void;
  filteredGroups?: Array<{ label: string }>;
  linkToDocumentation?: string;
  selectedSection?: string;
}

function DocumentationNav({
  searchText,
  setSearchText,
  onNavigationChange,
  filteredGroups,
  linkToDocumentation,
  selectedSection,
}: DocumentationNavProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false} direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow
            fullWidth
            label={i18n.translate('languageDocumentationPopover.esqlDocsLabel', {
              defaultMessage: 'Select or search topics',
            })}
            labelAppend={
              linkToDocumentation && (
                <EuiText size="xs">
                  <EuiLink
                    external
                    href={linkToDocumentation}
                    target="_blank"
                    data-test-subj="language-documentation-navigation-link"
                  >
                    {i18n.translate('languageDocumentationPopover.esqlDocsLinkLabel', {
                      defaultMessage: 'View full ES|QL documentation',
                    })}
                  </EuiLink>
                </EuiText>
              )
            }
          >
            <EuiComboBox
              aria-label={i18n.translate('languageDocumentationPopover.navigationAriaLabel', {
                defaultMessage: 'Navigate through the documentation',
              })}
              placeholder={i18n.translate('languageDocumentationPopover.navigationPlaceholder', {
                defaultMessage: 'Commands and functions',
              })}
              data-test-subj="language-documentation-navigation-dropdown"
              options={filteredGroups}
              selectedOptions={selectedSection ? [{ label: selectedSection }] : []}
              singleSelection={{ asPlainText: true }}
              onChange={onNavigationChange}
              compressed
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            padding: ${euiTheme.size.s} 0;
          `}
        >
          <EuiFieldSearch
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
            }}
            data-test-subj="language-documentation-navigation-search"
            placeholder={i18n.translate('languageDocumentationPopover.searchPlaceholder', {
              defaultMessage: 'Search',
            })}
            fullWidth
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export const DocumentationNavigation = React.memo(DocumentationNav);
