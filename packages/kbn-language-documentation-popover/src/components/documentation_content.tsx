/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopoverTitle,
  EuiText,
  EuiListGroupItem,
  EuiListGroup,
  EuiTitle,
  EuiFieldSearch,
  EuiHighlight,
  EuiSpacer,
} from '@elastic/eui';

import './documentation.scss';

export interface LanguageDocumentationSections {
  groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }>;
  initialSection: JSX.Element;
}

interface DocumentationProps {
  language: string;
  sections?: LanguageDocumentationSections;
}

function DocumentationContent({ language, sections }: DocumentationProps) {
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (selectedSection && scrollTargets.current[selectedSection]) {
      scrollTargets.current[selectedSection].scrollIntoView();
    }
  }, [selectedSection]);

  const [searchText, setSearchText] = useState('');

  const normalizedSearchText = searchText.trim().toLocaleLowerCase();

  const filteredGroups = sections?.groups
    .map((group) => {
      const items = group.items.filter((helpItem) => {
        return (
          !normalizedSearchText || helpItem.label.toLocaleLowerCase().includes(normalizedSearchText)
        );
      });
      return { ...group, items };
    })
    .filter((group) => {
      if (group.items.length > 0 || !normalizedSearchText) {
        return true;
      }
      return group.label.toLocaleLowerCase().includes(normalizedSearchText);
    });

  return (
    <>
      <EuiPopoverTitle
        className="documentation__docsHeader"
        paddingSize="m"
        data-test-subj="language-documentation-title"
      >
        {i18n.translate('languageDocumentationPopover.header', {
          defaultMessage: '{language} reference',
          values: { language },
        })}
      </EuiPopoverTitle>
      <EuiFlexGroup
        className="documentation__docsContent"
        gutterSize="none"
        responsive={false}
        alignItems="stretch"
      >
        <EuiFlexItem className="documentation__docsSidebar" grow={1}>
          <EuiFlexGroup
            className="documentation__docsSidebarInner"
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem className="documentation__docsSearch" grow={false}>
              <EuiFieldSearch
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
                data-test-subj="language-documentation-navigation-search"
                placeholder={i18n.translate('languageDocumentationPopover.searchPlaceholder', {
                  defaultMessage: 'Search',
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem className="documentation__docsNav">
              {filteredGroups?.map((helpGroup, index) => {
                return (
                  <nav className="documentation__docsNavGroup" key={helpGroup.label}>
                    <EuiTitle size="xxs" data-test-subj="language-documentation-navigation-title">
                      <h6>
                        <EuiLink
                          className="documentation__docsNavGroupLink"
                          color="text"
                          onClick={() => {
                            setSelectedSection(helpGroup.label);
                          }}
                        >
                          <EuiHighlight search={searchText}>{helpGroup.label}</EuiHighlight>
                        </EuiLink>
                      </h6>
                    </EuiTitle>

                    {helpGroup.items.length ? (
                      <>
                        <EuiSpacer size="s" />

                        <EuiListGroup gutterSize="none">
                          {helpGroup.items.map((helpItem) => {
                            return (
                              <EuiListGroupItem
                                key={helpItem.label}
                                label={
                                  <EuiHighlight search={searchText}>{helpItem.label}</EuiHighlight>
                                }
                                size="s"
                                onClick={() => {
                                  setSelectedSection(helpItem.label);
                                }}
                              />
                            );
                          })}
                        </EuiListGroup>
                      </>
                    ) : null}
                  </nav>
                );
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem className="documentation__docsText" grow={2}>
          <EuiText size="s">
            <section
              className="documentation__docsTextIntro"
              ref={(el) => {
                if (el && sections?.groups?.length) {
                  scrollTargets.current[sections.groups[0].label] = el;
                }
              }}
            >
              {sections?.initialSection}
            </section>
            {sections?.groups.slice(1).map((helpGroup, index) => {
              return (
                <section
                  className="documentation__docsTextGroup"
                  key={helpGroup.label}
                  ref={(el) => {
                    if (el) {
                      scrollTargets.current[helpGroup.label] = el;
                    }
                  }}
                >
                  <h2>{helpGroup.label}</h2>

                  <p>{helpGroup.description}</p>

                  {sections?.groups[index + 1].items.map((helpItem) => {
                    return (
                      <article
                        className="documentation__docsTextItem"
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export const LanguageDocumentationPopoverContent = React.memo(DocumentationContent);
