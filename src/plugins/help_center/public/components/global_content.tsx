/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
import { EuiFlexItem, EuiText, EuiPanel, EuiFlexGroup, EuiButton, EuiImage } from '@elastic/eui';
import { HelpCenterContext } from './help_center_header_nav_button';

export const GlobalContent = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  return (
    <>
      {(helpFetchResults?.global ?? []).map((link) => {
        const { content: text, href, image, description } = link;

        return (
          <EuiPanel>
            <EuiFlexGroup
              alignItems="center"
              responsive={true}
              css={css`
                width: 100%;
                height: 100%;
              `}
            >
              <EuiFlexItem grow={2}>
                <EuiText>
                  <h2>{text}</h2>
                  <p>{description}</p>
                  <EuiButton target="_blank" color="primary" fill href={href}>
                    Get started!
                  </EuiButton>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiImage size="fill" src={image} alt="" />
              </EuiFlexItem>
            </EuiFlexGroup>
            {/* <EuiSplitPanel.Inner paddingSize="l" grow={true}>
              <EuiText>
                <h2>{text}</h2>
                <p>{description}</p>
                <EuiButton target="_blank" color="primary" fill href={href}>
                  Get started!
                </EuiButton>
              </EuiText>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner grow={false}>
              <EuiImage size="l" src={image} alt="" />
            </EuiSplitPanel.Inner> */}
          </EuiPanel>
        );
      })}
    </>
  );
};
