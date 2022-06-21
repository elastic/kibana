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
import { Markdown } from '@kbn/kibana-react-plugin/public';
import { comparisonOperators, logicalOperators, mathOperators } from './documentation_sections';

import './documentation.scss';

function Documentation() {
  const [selectedOperator, setSelectedOperator] = useState<string | undefined>();
  const scrollTargets = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (selectedOperator && scrollTargets.current[selectedOperator]) {
      scrollTargets.current[selectedOperator].scrollIntoView();
    }
  }, [selectedOperator]);

  const groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];

  groups.push({
    label: i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.howItWorks', {
      defaultMessage: 'How it works',
    }),
    items: [],
  });
  groups.push(comparisonOperators, logicalOperators, mathOperators);

  const [searchText, setSearchText] = useState('');

  const normalizedSearchText = searchText.trim().toLocaleLowerCase();

  const filteredGroups = groups
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
      <EuiPopoverTitle className="documentation__docsHeader" paddingSize="m">
        {i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.documentation.header', {
          defaultMessage: 'SQL reference',
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
                placeholder={i18n.translate(
                  'unifiedSearch.query.textBasedLanguagesEditor.documentation.searchPlaceholder',
                  {
                    defaultMessage: 'Search operators',
                  }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem className="documentation__docsNav">
              {filteredGroups.map((helpGroup, index) => {
                return (
                  <nav className="documentation__docsNavGroup" key={helpGroup.label}>
                    <EuiTitle size="xxs">
                      <h6>
                        <EuiLink
                          className="documentation__docsNavGroupLink"
                          color="text"
                          onClick={() => {
                            setSelectedOperator(helpGroup.label);
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
                                  setSelectedOperator(helpItem.label);
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
                if (el) {
                  scrollTargets.current[groups[0].label] = el;
                }
              }}
            >
              <Markdown
                markdown={i18n.translate(
                  'unifiedSearch.query.textBasedLanguagesEditor.documentation.markdown',
                  {
                    defaultMessage: `## How it works

With Elasticsearch SQL, you can access that full text search, 
blazing speed, and effortless scalability with a familiar query syntax.
can use SQL to search and aggregate data natively inside Elasticsearch. 
One can think of Elasticsearch SQL as a translator, 
one that understands both SQL and Elasticsearch and makes it easy
to read and process data in real-time.

An example SQL query can be:

\`\`\`
SELECT * FROM library 
ORDER BY page_count DESC LIMIT 5
\`\`\`

As a general rule, Elasticsearch SQL as the name indicates provides a SQL interface to Elasticsearch.
As such, it follows the SQL terminology and conventions first, whenever possible.

Elasticsearch SQL currently accepts only one command at a time. A command is a sequence of tokens terminated by the end of input stream.

Elasticsearch SQL provides a comprehensive set of built-in operators and functions.

                  `,
                    description:
                      'Text is in markdown. Do not translate function names, special characters, or field names like sum(bytes)',
                  }
                )}
              />
            </section>
            {groups.slice(1).map((helpGroup, index) => {
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

                  {groups[index + 1].items.map((helpItem) => {
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

export const MemoizedDocumentation = React.memo(Documentation);
