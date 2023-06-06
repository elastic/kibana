/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import useAsync from 'react-use/lib/useAsync';
import {
  EuiIcon,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiCard,
  EuiSpacer,
  EuiSearchBar,
  euiCanAnimate,
  useEuiTheme,
  euiAnimFadeIn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ReactElement } from 'react-markdown';

import { HelpCenterContext } from './help_center_header_nav_button';
import { GlobalContent } from './global_content';
import { CustomContent } from './custom_content';
import { getCoreStart } from './docs_gpt';
import { ChromeHelpExtensionMenuDocumentationLink } from '@kbn/core-chrome-browser';

const MainDocumentationTabWithSearch = ({ setPanelTitle }) => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  const [searchResult, setSearchResult] = useState<ChromeHelpExtensionMenuDocumentationLink[]>([]);

  const searchForDocs = async (searchTerm: string) => {
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) {
      setSearchResult([]);
      return;
    }

    try {
      const response = await getCoreStart().http.get<{
        links: Array<{ title: string; url: string }>;
      }>('/internal/help_center/kibana_docs', {
        query: { query: trimmedSearchTerm },
      });

      if (response.links.length) {
        const links = response.links.map(({ title, url }) => {
          return {
            title,
            href: url,
            linkType: 'documentation',
          } as ChromeHelpExtensionMenuDocumentationLink;
        });
        setSearchResult(links);
      }
    } catch (e) {
      console.log('ERRORS');
    }
  };

  return (
    <>
      <EuiSearchBar
        onChange={({ queryText }) => {
          searchForDocs(queryText);
        }}
      />
      <MainDocumentationTab setPanelTitle={setPanelTitle} searchResult />
    </>
  );
};

const MainDocumentationTab = ({
  searchString,
  documentation,
  setCurrentTab,
  setPanelTitle,
  setDocumentation,
  setSearchString,
}: // documentation,
{
  searchString: string;
  documentation: ChromeHelpExtensionMenuDocumentationLink[];
  setCurrentTab: (newTab: number) => void;
  setPanelTitle: (el: ReactElement) => void;
  setDocumentation: (docs: ChromeHelpExtensionMenuDocumentationLink[]) => void;
  setSearchString: (search: string) => void;
  // documentation?: ChromeHelpExtensionMenuDocumentationLink[];
}) => {
  const { helpFetchResults } = useContext(HelpCenterContext);

  const searchForDocs = async (searchTerm: string) => {
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) {
      setSearchString('');
      setDocumentation(helpFetchResults?.documentation ?? []);
      return;
    }

    setSearchString(trimmedSearchTerm);
    try {
      const response = await getCoreStart().http.get<{
        links: Array<{ title: string; url: string }>;
      }>('/internal/help_center/kibana_docs', {
        query: { query: trimmedSearchTerm },
      });

      if (response.links.length) {
        const links = response.links.map(({ title, url }) => {
          return {
            title: title.split('|')[0],
            href: url,
            linkType: 'documentation',
          } as ChromeHelpExtensionMenuDocumentationLink;
        });
        setDocumentation(links);
      }
    } catch (e) {
      console.log('ERRORS');
    }
  };

  return (
    <div>
      <EuiSearchBar
        defaultQuery={searchString}
        // box={{
        //   placeholder: 'type:visualization -is:active joe',
        //   incremental,
        //   schema,
        // }}
        // filters={filters}
        onChange={({ queryText }) => {
          searchForDocs(queryText);
        }}
      />
      <EuiSpacer size="m" />
      {(documentation ?? []).map((doc, i) => {
        return (
          <>
            <EuiCard
              className="help-center-card"
              hasBorder={true}
              paddingSize="s"
              id={`contact_card_${i}`}
              // layout={'horizontal'}
              // icon={<EuiIcon size="xl" type={doc.iconType ?? 'discuss'} />}
              title={
                <EuiFlexGroup
                  css={css`
                    width: 100%;
                  `}
                  // justifyContent="spaceBetween"
                  alignItems="center"
                >
                  {doc.iconType && (
                    <EuiFlexItem grow={false}>
                      <EuiIcon size="l" type={doc.iconType} />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem
                    grow={true}
                    css={css`
                      text-align: left;
                    `}
                  >
                    {doc.title ?? 'Documentation'}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="m" type="arrowRight" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              target="_blank"
              // href={doc.href}
              onClick={() => {
                setCurrentTab(i + 1);
                setPanelTitle(
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type="arrowLeft"
                        css={css`
                          &:hover {
                            cursor: pointer;
                          }
                        `}
                        size="l"
                        onClick={() => {
                          setCurrentTab(0);
                          setPanelTitle(
                            <EuiTitle size="m">
                              <h2 id="flyoutSmallTitle">
                                <FormattedMessage
                                  id="helpCenter__flyoutTitle"
                                  defaultMessage="Help"
                                />
                              </h2>
                            </EuiTitle>
                          );
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiTitle size="m">
                        <h2>{doc.title ?? 'Documentation'}</h2>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              }}
              titleSize="xs"
            />
            <EuiSpacer size="s" />
          </>
        );
      })}
      <GlobalContent />
      <EuiSpacer size="l" />
    </div>
  );
};

export const DocumentationTab = ({
  setPanelTitle,
}: {
  setPanelTitle: (el: ReactElement) => void;
}) => {
  const [searchString, setSearchString] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const { helpFetchResults } = useContext(HelpCenterContext);
  const parser = useMemo(() => new DOMParser(), []);

  const [documentation, setDocumentation] = useState<ChromeHelpExtensionMenuDocumentationLink[]>(
    helpFetchResults?.documentation ?? []
  );

  useEffect(() => {
    if (searchString === '') setDocumentation(helpFetchResults?.documentation ?? []);
  }, [helpFetchResults, searchString]);

  const { loading: documentationLoading, value: panels = [] as ReactElement[] } =
    useAsync(async () => {
      const mainPanels = await Promise.all(
        documentation.map(async (doc, i) => {
          if (doc.content) return doc.content;

          const response = await fetch(doc.href);
          const data = await response.text();

          const content = parser.parseFromString(data, 'text/html').querySelector('div#content');
          if (content) {
            content
              .querySelectorAll(
                '.edit_me, .vidyard-player-embed, br, h1, div.breadcrumbs, div.navheader, div.navfooter'
              )
              .forEach((e) => e.remove());
            content.querySelectorAll('img').forEach((e) => {
              const src = e.getAttribute('src') ?? '';
              const newSrc = `https://www.elastic.co/guide/en/kibana/master/${src}`;
              e.setAttribute('src', newSrc);
            });
            content.querySelectorAll('a').forEach((e) => {
              const href = e.getAttribute('href') ?? '';
              if (!href.includes('video')) {
                const newHref = `https://www.elastic.co/guide/en/kibana/master/${href}`;
                e.setAttribute('href', newHref);
                e.setAttribute('target', '_blank');
              }
            });
          }
          return (
            <EuiText>
              <div dangerouslySetInnerHTML={{ __html: content?.outerHTML }} />
            </EuiText>
          );
        })
      );
      return mainPanels;
    }, [documentation]);

  return currentTab === 0 || documentationLoading ? (
    <MainDocumentationTab
      searchString={searchString}
      documentation={documentation}
      setCurrentTab={setCurrentTab}
      setPanelTitle={setPanelTitle}
      setDocumentation={setDocumentation}
      setSearchString={setSearchString}
    />
  ) : (
    panels[currentTab - 1]
  );
};
