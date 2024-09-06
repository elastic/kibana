/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
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
      {linkToDocumentation && (
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-end;
            padding-top: ${euiTheme.size.xs};
          `}
        >
          <EuiLink external href={linkToDocumentation} target="_blank">
            {i18n.translate('languageDocumentationPopover.esqlDocsLabel', {
              defaultMessage: 'View full ES|QL documentation',
            })}
          </EuiLink>
        </EuiFlexItem>
      )}
      <EuiFlexGroup gutterSize="none" responsive={false} direction="column">
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
        <EuiFlexItem grow={false}>
          <EuiComboBox
            aria-label={i18n.translate('languageDocumentationPopover.navigationAriaLabel', {
              defaultMessage: 'Navigate through the documentation',
            })}
            placeholder={i18n.translate('languageDocumentationPopover.navigationPlaceholder', {
              defaultMessage: 'Commands and functions',
            })}
            options={filteredGroups}
            selectedOptions={selectedSection ? [{ label: selectedSection }] : []}
            singleSelection={{ asPlainText: true }}
            onChange={onNavigationChange}
            compressed
            fullWidth
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export const DocumentationNavigation = React.memo(DocumentationNav);
