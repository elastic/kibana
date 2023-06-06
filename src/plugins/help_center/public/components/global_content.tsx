/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiButton,
  EuiImage,
  EuiSpacer,
} from '@elastic/eui';
import { HelpCenterContext } from './help_center_header_nav_button';

export const GlobalContent = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  return (
    <>
      {(helpFetchResults?.global ?? []).map((link, i) => {
        const { content: text, href, image, description } = link;

        return (
          <EuiPanel key={`documentation-card-${i}`} hasBorder={true}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexStart"
              responsive={true}
              css={css`
                width: 100%;
                height: 100%;
              `}
            >
              <EuiFlexItem grow={2}>
                <EuiText size="xs">
                  <h2>{text}</h2>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiText>
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
          </EuiPanel>
        );
      })}
    </>
  );
};
