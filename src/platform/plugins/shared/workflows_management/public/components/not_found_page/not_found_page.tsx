/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';

export interface NotFoundPageProps {
  title: string;
  body: string;
  backLabel: string;
  onBack: () => void;
  'data-test-subj': string;
  backButtonDataTestSubj: string;
}

/** Full-height "not found" prompt with a single back action. */
export const NotFoundPage = ({
  title,
  body,
  backLabel,
  onBack,
  'data-test-subj': dataTestSubj,
  backButtonDataTestSubj,
}: NotFoundPageProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={[
        kbnFullBodyHeightCss(),
        css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: euiTheme.colors.emptyShade,
        }),
      ]}
      data-test-subj={dataTestSubj}
    >
      <NotFoundPrompt
        title={title}
        body={body}
        actions={
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            flush="both"
            onClick={onBack}
            aria-label={backLabel}
            data-test-subj={backButtonDataTestSubj}
          >
            {backLabel}
          </EuiButtonEmpty>
        }
      />
    </div>
  );
};
