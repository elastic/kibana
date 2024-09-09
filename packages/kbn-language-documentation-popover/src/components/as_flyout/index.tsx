/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { EuiFlyout, useEuiTheme, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { getFilteredGroups } from '../../utils/get_filtered_groups';
import { DocumentationMainContent, DocumentationNavigation } from '../shared';
import type { LanguageDocumentationSections } from '../../types';

interface DocumentationFlyoutProps {
  isHelpMenuOpen: boolean;
  onHelpMenuVisibilityChange: (status: boolean) => void;
  sections?: LanguageDocumentationSections;
  searchInDescription?: boolean;
  linkToDocumentation?: string;
}

function DocumentationFlyout({
  sections,
  searchInDescription,
  linkToDocumentation,
  isHelpMenuOpen,
  onHelpMenuVisibilityChange,
}: DocumentationFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const DEFAULT_WIDTH = euiTheme.base * 34;

  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  const filteredGroups = useMemo(() => {
    return getFilteredGroups(searchText, searchInDescription, sections, 1);
  }, [sections, searchText, searchInDescription]);

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

  return (
    <>
      {isHelpMenuOpen && (
        <EuiFlyout
          ownFocus
          onClose={() => onHelpMenuVisibilityChange(false)}
          aria-labelledby="esqlInlineDocumentationFlyout"
          type="push"
          size={DEFAULT_WIDTH}
        >
          <EuiFlyoutHeader hasBorder>
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
              sections={sections}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
}

export const LanguageDocumentationFlyout = React.memo(DocumentationFlyout);
