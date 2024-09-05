/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useRef, useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiFieldSearch,
  EuiLink,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  useEuiTheme,
  EuiComboBox,
} from '@elastic/eui';
import { elementToString } from '../utils/element_to_string';
import { LanguageDocumentationSections } from '../types';

interface DocumentationFlyoutProps {
  sections?: LanguageDocumentationSections;
  // if sets to true, allows searching in the markdown description
  searchInDescription?: boolean;
  // if set, a link will appear on the top right corner
  linkToDocumentation?: string;
}

function DocumentationFlyoutContent({
  sections,
  searchInDescription,
  linkToDocumentation,
}: DocumentationFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');

  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  const normalizedSearchText = useMemo(() => searchText.trim().toLocaleLowerCase(), [searchText]);

  const filteredGroups = useMemo(() => {
    return sections?.groups
      .slice(1)
      .map((group) => {
        const items = group.items.filter((helpItem) => {
          return (
            !normalizedSearchText ||
            helpItem.label.toLocaleLowerCase().includes(normalizedSearchText) ||
            // Converting the JSX element to a string first
            (searchInDescription &&
              elementToString(helpItem.description)
                ?.toLocaleLowerCase()
                .includes(normalizedSearchText))
          );
        });
        return { ...group, options: items };
      })
      .filter((group) => {
        if (group.options.length > 0 || !normalizedSearchText) {
          return true;
        }
        return group.label.toLocaleLowerCase().includes(normalizedSearchText);
      });
  }, [sections, normalizedSearchText, searchInDescription]);

  const onNavigationChange = useCallback((selectedOptions) => {
    setSelectedSection(selectedOptions.length ? selectedOptions[0].label : undefined);
    if (selectedOptions.length) {
      const scrollToElement = scrollTargets.current[selectedOptions[0].label];
      scrollToElement.scrollIntoView();
    }
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
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
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="none" responsive={false} direction="column">
          <EuiText size="s">
            {!searchText && (
              <section
                ref={(el) => {
                  if (el && sections?.groups?.length) {
                    scrollTargets.current[sections.groups[0].label] = el;
                  }
                }}
              >
                {sections?.initialSection}
              </section>
            )}
            {filteredGroups?.map((helpGroup, index) => {
              return (
                <section
                  key={helpGroup.label}
                  ref={(el) => {
                    if (el) {
                      scrollTargets.current[helpGroup.label] = el;
                    }
                  }}
                >
                  <h2>{helpGroup.label}</h2>

                  <p>{helpGroup.description}</p>

                  {filteredGroups?.[index].options.map((helpItem) => {
                    return (
                      <article
                        key={helpItem.label}
                        ref={(el) => {
                          if (el) {
                            scrollTargets.current[helpItem.label] = el;
                          }
                        }}
                      >
                        {helpItem.description}
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </>
  );
}

export const LanguageDocumentationFlyoutContent = React.memo(DocumentationFlyoutContent);
