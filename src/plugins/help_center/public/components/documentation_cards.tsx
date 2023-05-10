/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiIcon, EuiCard, EuiSpacer, EuiText, EuiAccordion } from '@elastic/eui';

import { HelpCenterContext } from './help_center_header_nav_button';
import { css } from '@emotion/react';
import ReactDOM from 'react-dom';

export const DocumentationCards = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  const parser = useMemo(() => new DOMParser(), []);

  const { loading: documentationLoading, value: innerHtml = [] as string[] } =
    useAsync(async () => {
      return await Promise.all(
        (helpFetchResults?.documentation ?? []).map(async (doc, i) => {
          const response = await fetch(doc.href);
          const data = await response.text();

          const content = parser
            .parseFromString(data, 'text/html')
            .getElementById('middle_col')
            ?.getElementsByClassName('part')?.[0];
          console.log(doc, i, content);
          if (content) {
            content.querySelectorAll('.edit_me').forEach((e) => e.remove());
            content.querySelectorAll('img').forEach((e) => {
              const src = e.getAttribute('src') ?? '';
              const newSrc = `https://www.elastic.co/guide/en/kibana/master/${src}`;
              e.setAttribute('src', newSrc);
            });
            content.querySelectorAll('a').forEach((e) => {
              const href = e.getAttribute('href') ?? '';
              const newHref = `https://www.elastic.co/guide/en/kibana/master/${href}`;
              e.setAttribute('href', newHref);
              e.setAttribute('target', '_blank');
            });
          }
          return content?.outerHTML;
        })
      );
    }, [helpFetchResults?.documentation]);

  // const innerHtml = useMemo(() => {
  // const test: string[] = [];
  // (helpFetchResults?.documentation ?? []).map((doc, i) => {
  //   fetch(doc.href)
  //     .then((response) => {
  //       return response.text();
  //     })
  //     .then((data) => {
  //       const content = parser
  //         .parseFromString(data, 'text/html')
  //         .getElementById('middle_col')
  //         ?.getElementsByClassName('part')?.[0];
  //       console.log(doc, i, content);
  //       if (content) {
  //         content.querySelectorAll('.edit_me').forEach((e) => e.remove());
  //         content.querySelectorAll('img').forEach((e) => {
  //           const src = e.getAttribute('src') ?? '';
  //           const newSrc = `https://www.elastic.co/guide/en/kibana/master/${src}`;
  //           e.setAttribute('src', newSrc);
  //         });
  //         content.querySelectorAll('a').forEach((e) => {
  //           const href = e.getAttribute('href') ?? '';
  //           const newHref = `https://www.elastic.co/guide/en/kibana/master/${href}`;
  //           e.setAttribute('href', newHref);
  //           e.setAttribute('target', '_blank');
  //         });

  //         test.push(`${content}`);
  //       }
  //     });
  // });
  // console.log('test', test);
  // return test;
  // }, [parser, helpFetchResults?.documentation]);

  return (
    <>
      {(helpFetchResults?.documentation ?? []).map((doc, i) => {
        //   <EuiCard
        //   css={css`
        //     margin-block-end: 0;
        //   `}
        //   layout={'horizontal'}
        //   icon={<EuiIcon size="xl" type={doc.iconType ?? 'document'} />}
        //   title={`Visit the ${doc.title} documentation`}
        //   target="_blank"
        //   onClick={() => {
        //     const nextHtml = innerHtml.map((c, index) => {
        //       if (index === i) {
        //         // Increment the clicked counter
        //         return innerHtmlTest[i];
        //       } else {
        //         // The rest haven't changed
        //         return '';
        //       }
        //     });
        //     setInnerHtml(nextHtml);
        //   }}
        //   titleSize="xs"
        // />

        return (
          <EuiAccordion
            id={`documentation-${i}`}
            buttonContent={
              <EuiCard
                css={css`
                  margin-block-end: 0;
                `}
                layout={'horizontal'}
                icon={<EuiIcon size="xl" type={doc.iconType ?? 'document'} />}
                title={`Visit the ${doc.title} documentation`}
                target="_blank"
                titleSize="xs"
              />
            }
          >
            <EuiText>
              <div dangerouslySetInnerHTML={{ __html: innerHtml[i] }} />
            </EuiText>
          </EuiAccordion>
        );
      })}
    </>
  );
};
