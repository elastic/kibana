/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiFlexGroup, EuiText } from '@elastic/eui';
import type { LanguageDocumentationSections } from '../../types';

interface DocumentationContentProps {
  searchText: string;
  scrollTargets: React.MutableRefObject<{ [key: string]: HTMLElement }>;
  filteredGroups?: Array<{
    label: string;
    description?: string;
    options: Array<{ label: string; description?: JSX.Element | undefined }>;
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
    </>
  );
}

export const DocumentationMainContent = React.memo(DocumentationContent);
