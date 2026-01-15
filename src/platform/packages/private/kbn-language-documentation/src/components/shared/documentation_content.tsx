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
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiBetaBadge } from '@elastic/eui';
import type {
  DocumentationGroupItem,
  LanguageDocumentationSections,
  LicenseInfo,
  MultipleLicenseInfo,
} from '../../types';
import { getLicensesArray } from '../../utils/get_license_array';
import { MarkdownWithHighlight } from './markdown_with_highlight';

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function createLicenseTooltip(license: LicenseInfo): string {
  function startsWithVowel(str: string): boolean {
    return /^[aeiouAEIOU]/.test(str);
  }

  let tooltip = i18n.translate('languageDocumentation.licenseRequiredTooltip', {
    defaultMessage: 'This feature requires {articleType} {license} subscription',
    values: {
      license: toTitleCase(license.name),
      articleType: startsWithVowel(license.name) ? 'an' : 'a',
    },
  });

  if (license.isSignatureSpecific && license?.paramsWithLicense?.length) {
    tooltip += ` ${i18n.translate('languageDocumentation.licenseParamsNote', {
      defaultMessage: ' to use the following values: {params}',
      values: { params: license.paramsWithLicense.join(', ') },
    })}`;
  }

  tooltip += `.`;

  return tooltip;
}

interface DocumentationContentProps {
  searchText: string;
  scrollTargets: React.MutableRefObject<{ [key: string]: HTMLElement }>;
  filteredGroups?: Array<{
    label: string;
    description?: string;
    items: Array<
      DocumentationGroupItem & { preview?: boolean; license?: MultipleLicenseInfo | undefined }
    >;
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
                  &:not(:first-of-type) {
                    border-top: ${theme.euiTheme.border.thin};
                    padding-top: ${theme.euiTheme.size.xxl};
                    margin-top: ${theme.euiTheme.size.xxl};
                  }
                `}
                ref={(el) => {
                  if (el) {
                    scrollTargets.current[helpGroup.label] = el;
                  }
                }}
              >
                <h2>{<MarkdownWithHighlight markdownContent={helpGroup.label} />}</h2>

                {helpGroup.description !== undefined ? (
                  <MarkdownWithHighlight markdownContent={helpGroup.description} />
                ) : null}

                {filteredGroups?.[index].items.map((helpItem) => {
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
                      {(helpItem.preview || helpItem.license) && (
                        <EuiFlexGroup
                          gutterSize="s"
                          css={css`
                            margin-bottom: ${theme.euiTheme.size.s};
                          `}
                        >
                          {helpItem.preview && (
                            <EuiFlexItem grow={false}>
                              <EuiBetaBadge
                                label={i18n.translate(
                                  'languageDocumentation.technicalPreviewLabel',
                                  {
                                    defaultMessage: 'Technical Preview',
                                  }
                                )}
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
                            </EuiFlexItem>
                          )}
                          {getLicensesArray(helpItem.license).map((license) => (
                            <EuiFlexItem key={license.name} grow={false}>
                              <EuiBetaBadge
                                label={toTitleCase(license.name)}
                                tooltipContent={createLicenseTooltip(license)}
                                color="subdued"
                                size="s"
                              />
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      )}
                      <MarkdownWithHighlight
                        markdownContent={helpItem.description?.markdownContent ?? ''}
                        openLinksInNewTab={helpItem.description?.openLinksInNewTab}
                      />
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
