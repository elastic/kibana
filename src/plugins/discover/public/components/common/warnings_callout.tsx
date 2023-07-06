/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { SearchResponseInterceptedWarning } from '../../types';

export interface WarningsCalloutProps {
  interceptedWarnings?: SearchResponseInterceptedWarning[];
  'data-test-subj'?: string;
}

export const WarningsCallout = ({
  interceptedWarnings,
  'data-test-subj': dataTestSubj,
}: WarningsCalloutProps) => {
  if (!interceptedWarnings?.length) {
    return null;
  }

  return (
    <>
      {interceptedWarnings.map(({ originalWarning, action }, index) => (
        <EuiCallOut
          key={`warning-${index}`}
          title={
            <EuiFlexGroup gutterSize="xs" alignItems="center" direction="row">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{originalWarning.message}</strong>
                </EuiText>
              </EuiFlexItem>
              {'text' in originalWarning ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{originalWarning.text}</p>
                  </EuiText>
                </EuiFlexItem>
              ) : null}
              {action ? <EuiFlexItem grow={false}>{action}</EuiFlexItem> : null}
            </EuiFlexGroup>
          }
          color="warning"
          iconType="warning"
          size="s"
          css={css`
            .euiTitle {
              display: flex;
              align-items: center;
            }
          `}
          data-test-subj={dataTestSubj}
        />
      ))}
    </>
  );
};
