/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiText, EuiBetaBadge } from '@elastic/eui';
import type { LanguageDocumentationSections } from '../../types';

import './documentation.scss';

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
  return (
    <>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        direction="column"
        className="documentation__docsText"
      >
        <EuiText size="s">
          {!searchText && (
            <section
              ref={(el) => {
                if (el && sections?.groups?.length) {
                  scrollTargets.current[sections.groups[0].label] = el;
                }
              }}
              className="documentation__docsTextIntro"
            >
              {sections?.initialSection}
            </section>
          )}
          {filteredGroups?.map((helpGroup, index) => {
            return (
              <section
                key={helpGroup.label}
                className="documentation__docsTextGroup"
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
                      className="documentation__docsTextItem"
                      key={helpItem.label}
                      ref={(el) => {
                        if (el) {
                          scrollTargets.current[helpItem.label] = el;
                        }
                      }}
                    >
                      {helpItem.preview && (
                        <EuiBetaBadge
                          className="documentation__techPreviewBadge"
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
