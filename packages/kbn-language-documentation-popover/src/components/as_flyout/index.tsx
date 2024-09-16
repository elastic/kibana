/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  EuiFlyout,
  useEuiTheme,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { getFilteredGroups } from '../../utils/get_filtered_groups';
import { DocumentationMainContent, DocumentationNavigation } from '../shared';
import { getESQLDocsSections } from '../../sections';
import type { LanguageDocumentationSections } from '../../types';

interface DocumentationFlyoutProps {
  isHelpMenuOpen: boolean;
  onHelpMenuVisibilityChange: (status: boolean) => void;
  searchInDescription?: boolean;
  linkToDocumentation?: string;
}

function DocumentationFlyout({
  searchInDescription,
  linkToDocumentation,
  isHelpMenuOpen,
  onHelpMenuVisibilityChange,
}: DocumentationFlyoutProps) {
  const [documentationSections, setDocumentationSections] =
    useState<LanguageDocumentationSections>();

  const { euiTheme } = useEuiTheme();
  const DEFAULT_WIDTH = euiTheme.base * 34;

  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  const onNavigationChange = useCallback((selectedOptions) => {
    setSelectedSection(selectedOptions.length ? selectedOptions[0].label : undefined);
    if (selectedOptions.length) {
      const scrollToElement = scrollTargets.current[selectedOptions[0].label];
      scrollToElement.scrollIntoView();
    }
  }, []);

  useEffect(() => {
    onHelpMenuVisibilityChange(isHelpMenuOpen ?? false);
  }, [isHelpMenuOpen, onHelpMenuVisibilityChange]);

  useEffect(() => {
    async function getDocumentation() {
      const sections = await getESQLDocsSections();
      setDocumentationSections(sections);
    }
    if (!documentationSections) {
      getDocumentation();
    }
  }, [documentationSections]);

  const filteredGroups = useMemo(() => {
    return getFilteredGroups(searchText, searchInDescription, documentationSections, 1);
  }, [documentationSections, searchText, searchInDescription]);

  return (
    <>
      {isHelpMenuOpen && (
        <EuiFlyout
          ownFocus
          onClose={() => onHelpMenuVisibilityChange(false)}
          aria-labelledby="esqlInlineDocumentationFlyout"
          type="push"
          size={DEFAULT_WIDTH}
          paddingSize="m"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h3>ES|QL quick reference</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <DocumentationNavigation
              searchText={searchText}
              setSearchText={setSearchText}
              onNavigationChange={onNavigationChange}
              filteredGroups={filteredGroups}
              linkToDocumentation={linkToDocumentation}
              selectedSection={selectedSection}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <DocumentationMainContent
              searchText={searchText}
              scrollTargets={scrollTargets}
              filteredGroups={filteredGroups}
              sections={documentationSections}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

export const LanguageDocumentationFlyout = React.memo(DocumentationFlyout);
