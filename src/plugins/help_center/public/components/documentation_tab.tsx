/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useMemo, useState } from 'react';
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

const MainDocumentationTab = ({
  setCurrentTab,
  setPanelTitle,
}: {
  setCurrentTab: (newTab: number) => void;
  setPanelTitle: (el: ReactElement) => void;
}) => {
  const { helpFetchResults } = useContext(HelpCenterContext);

  return (
    <div>
      <EuiSearchBar
      // defaultQuery={initialQuery}
      // box={{
      //   placeholder: 'type:visualization -is:active joe',
      //   incremental,
      //   schema,
      // }}
      // filters={filters}
      // onChange={onChange}
      />
      <EuiSpacer size="m" />
      {(helpFetchResults?.documentation ?? []).map((doc, i) => {
        return (
          <>
            <EuiCard
              className="help-center-card"
              hasBorder={true}
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
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="xl" type={doc.iconType ?? 'discuss'} />
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={true}
                    css={css`
                      text-align: left;
                    `}
                  >
                    {doc.title ?? 'Documentation'}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="l" type="arrowRight" />
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
  const [currentTab, setCurrentTab] = useState(0);
  const { helpFetchResults } = useContext(HelpCenterContext);
  const parser = useMemo(() => new DOMParser(), []);

  const { loading: documentationLoading, value: panels = [] as ReactElement[] } =
    useAsync(async () => {
      const mainPanels = await Promise.all(
        (helpFetchResults?.documentation ?? []).map(async (doc, i) => {
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
    }, [helpFetchResults?.documentation]);

  return currentTab === 0 || documentationLoading ? (
    <MainDocumentationTab setCurrentTab={setCurrentTab} setPanelTitle={setPanelTitle} />
  ) : (
    panels[currentTab - 1]
  );
};
