/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopoverTitle,
  EuiText,
  EuiListGroupItem,
  EuiListGroup,
  EuiTitle,
  EuiFieldSearch,
  EuiHighlight,
  EuiSpacer,
  EuiLink,
  useEuiTheme,
  euiScrollBarStyles,
} from '@elastic/eui';
import { getFilteredGroups } from '../../utils/get_filtered_groups';
import type { LanguageDocumentationSections } from '../../types';

interface DocumentationProps {
  language: string;
  sections?: LanguageDocumentationSections;
  // if sets to true, allows searching in the markdown description
  searchInDescription?: boolean;
  // if set, a link will appear on the top right corner
  linkToDocumentation?: string;
}

function DocumentationContent({
  language,
  sections,
  searchInDescription,
  linkToDocumentation,
}: DocumentationProps) {
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);
  const [selectedSection, setSelectedSection] = useState<string | undefined>();
  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (selectedSection && scrollTargets.current[selectedSection]) {
      scrollTargets.current[selectedSection].scrollIntoView();
    }
  }, [selectedSection]);

  const [searchText, setSearchText] = useState('');

  const filteredGroups = useMemo(() => {
    return getFilteredGroups(searchText, searchInDescription, sections);
  }, [sections, searchText, searchInDescription]);

  return (
    <>
      <EuiPopoverTitle
        css={css`
          margin: 0;
        `}
        paddingSize="m"
        data-test-subj="language-documentation-title"
      >
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            {i18n.translate('languageDocumentation.header', {
              defaultMessage: '{language} reference',
              values: { language },
            })}
          </EuiFlexItem>
          {linkToDocumentation && (
            <EuiFlexItem grow={false}>
              <EuiLink external href={linkToDocumentation} target="_blank">
                {i18n.translate('languageDocumentation.documentationLinkLabel', {
                  defaultMessage: 'View full documentation',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiFlexGroup
        css={css`
          .documentation__docs--overlay & {
            height: 40vh;
            width: min(75vh, 90vw);
          }
          .documentation__docs--inline & {
            flex: 1;
            min-height: 0;
          }
          & > * + * {
            border-left: ${theme.euiTheme.border.thin};
          }
        `}
        gutterSize="none"
        responsive={false}
        alignItems="stretch"
      >
        <EuiFlexItem
          css={css`
            background-color: ${theme.euiTheme.colors.backgroundBaseDisabled};
          `}
          grow={1}
        >
          <EuiFlexGroup
            css={css`
              min-height: 0;

              & > * + * {
                border-top: ${theme.euiTheme.border.thin};
              }
            `}
            direction="column"
            gutterSize="none"
            responsive={false}
          >
            <EuiFlexItem
              css={css`
                padding: ${theme.euiTheme.size.base};
              `}
              grow={false}
            >
              <EuiFieldSearch
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
                data-test-subj="language-documentation-navigation-search"
                placeholder={i18n.translate('languageDocumentation.searchPlaceholder', {
                  defaultMessage: 'Search',
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                ${scrollBarStyles}
                overflow-y: auto;
              `}
            >
              {filteredGroups?.map((helpGroup, index) => {
                return (
                  <nav
                    key={helpGroup.label}
                    css={css`
                      padding: ${theme.euiTheme.size.base};

                      & + & {
                        border-top: ${theme.euiTheme.border.thin};
                      }
                    `}
                  >
                    <EuiTitle size="xxs" data-test-subj="language-documentation-navigation-title">
                      <h6>
                        <EuiLink
                          css={css`
                            font-weight: inherit;
                          `}
                          color="text"
                          onClick={() => {
                            setSelectedSection(helpGroup.label);
                          }}
                        >
                          <EuiHighlight search={searchText}>{helpGroup.label}</EuiHighlight>
                        </EuiLink>
                      </h6>
                    </EuiTitle>

                    {helpGroup.options.length ? (
                      <>
                        <EuiSpacer size="s" />

                        <EuiListGroup gutterSize="none">
                          {helpGroup.options.map((helpItem) => {
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
        <EuiFlexItem
          grow={2}
          css={css`
            padding: ${theme.euiTheme.size.base};
            ${scrollBarStyles}
            overflow-y: auto;
          `}
        >
          <EuiText size="s">
            <section
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
                  css={css`
                    border-top: ${theme.euiTheme.border.thin};
                    padding-top: ${theme.euiTheme.size.xxl};
                    margin-top: ${theme.euiTheme.size.xxl};
                  `}
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
                        css={css`
                          margin-top: ${theme.euiTheme.size.xxl};
                        `}
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
