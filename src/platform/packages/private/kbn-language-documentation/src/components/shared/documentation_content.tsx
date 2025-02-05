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
import { i18n } from '@kbn/i18n';
import { useEuiTheme, euiScrollBarStyles } from '@elastic/eui';
import { EuiFlexGroup, EuiText, EuiBetaBadge } from '@elastic/eui';
import type { LanguageDocumentationSections } from '../../types';

interface DocumentationContentProps {
  searchText: string;
  scrollTargets: React.MutableRefObject<{ [key: string]: HTMLElement }>;
  filteredGroups?: Array<{
    label: string;
    description?: string;
    options: Array<{ label: string; description?: JSX.Element | undefined; preview?: boolean }>;
  }>;
  sections?: LanguageDocumentationSections;
}

function DocumentationContent({
  searchText,
  scrollTargets,
  filteredGroups,
  sections,
}: DocumentationContentProps) {
  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);
  return (
    <>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        direction="column"
        css={css`
          padding: ${theme.euiTheme.size.base};
          ${scrollBarStyles}
          overflow-y: auto;
        `}
      >
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
                css={css`
                  border-top: ${theme.euiTheme.border.thin};
                  padding-top: ${theme.euiTheme.size.xxl};
                  margin-top: ${theme.euiTheme.size.xxl};
                `}
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
                      {helpItem.preview && (
                        <EuiBetaBadge
                          css={css`
                            margin-bottom: ${theme.euiTheme.size.s};
                          `}
                          label={i18n.translate('languageDocumentation.technicalPreviewLabel', {
                            defaultMessage: 'Technical Preview',
                          })}
                          size="s"
                          color="subdued"
                          tooltipContent={i18n.translate(
                            'languageDocumentation.technicalPreviewTooltip',
                            {
                              defaultMessage:
                                'This functionality is experimental and not supported. It may change or be removed at any time.',
                            }
                          )}
                        />
                      )}
                      {helpItem.description}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </EuiText>
      </EuiFlexGroup>
    </>
  );
}

export const DocumentationMainContent = React.memo(DocumentationContent);
