/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useState, useRef, useMemo, useEffect, ComponentProps } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, euiScrollBarStyles, EuiSpacer } from '@elastic/eui';
import { getFilteredGroups } from '../../utils/get_filtered_groups';
import { DocumentationMainContent, DocumentationNavigation } from '../shared';
import type { LanguageDocumentationSections } from '../../types';
import { getESQLDocsSections } from '../../sections';

interface DocumentationInlineProps {
  height: number;
  searchInDescription?: boolean;
}

function DocumentationInline({ searchInDescription, height }: DocumentationInlineProps) {
  const theme = useEuiTheme();
  const [documentationSections, setDocumentationSections] =
    useState<LanguageDocumentationSections>();
  const scrollBarStyles = euiScrollBarStyles(theme);
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  const scrollTargets = useRef<Record<string, HTMLElement>>({});

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

  const onNavigationChange = useCallback<
    NonNullable<ComponentProps<typeof DocumentationNavigation>>['onNavigationChange']
  >((selectedOptions) => {
    setSelectedSection(selectedOptions.length ? selectedOptions[0].label : undefined);
    if (selectedOptions.length) {
      const scrollToElement = scrollTargets.current[selectedOptions[0].label];
      scrollToElement.scrollIntoView();
    }
  }, []);

  return (
    <div
      css={css`
        padding: ${theme.euiTheme.size.base};
        max-height: ${height}px;
        overflow-y: auto;
        ${scrollBarStyles}
      `}
    >
      <DocumentationNavigation
        searchText={searchText}
        setSearchText={setSearchText}
        onNavigationChange={onNavigationChange}
        filteredGroups={filteredGroups}
        selectedSection={selectedSection}
      />
      <EuiSpacer size="s" />
      <DocumentationMainContent
        searchText={searchText}
        scrollTargets={scrollTargets}
        filteredGroups={filteredGroups}
        sections={documentationSections}
      />
    </div>
  );
}

export const LanguageDocumentationInline = React.memo(DocumentationInline);
