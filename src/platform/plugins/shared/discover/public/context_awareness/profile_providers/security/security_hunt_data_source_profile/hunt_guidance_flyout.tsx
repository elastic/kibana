/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { HuntSessionInfo } from '@kbn/discover-shared-plugin/public';
import * as i18n from './translations';

interface HuntGuidanceFlyoutProps {
  definition: HuntSessionInfo['definition'];
  onClose: () => void;
}

const BulletSection: React.FC<{ heading: string; items: string[]; testId: string }> = ({
  heading,
  items,
  testId,
}) =>
  items.length === 0 ? null : (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xxs" data-test-subj={testId}>
        <h4>{heading}</h4>
      </EuiTitle>
      <EuiText size="s">
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </EuiText>
    </>
  );

/** The hunt's hypothesis and guidance, beside the analyst's Discover session. */
export const HuntGuidanceFlyout: React.FC<HuntGuidanceFlyoutProps> = ({ definition, onClose }) => (
  <EuiFlyout
    size="s"
    onClose={onClose}
    ownFocus={false}
    aria-label={i18n.GUIDANCE_FLYOUT_TITLE}
    data-test-subj="discoverHuntGuidanceFlyout"
  >
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2>{definition.name}</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiTitle size="xxs">
        <h4>{i18n.HYPOTHESIS_HEADING}</h4>
      </EuiTitle>
      <EuiText size="s" data-test-subj="discoverHuntHypothesis">
        <p>{definition.hypothesis}</p>
      </EuiText>
      <BulletSection
        heading={i18n.ANALYST_NOTES_HEADING}
        items={definition.guidance.analystNotes}
        testId="discoverHuntAnalystNotes"
      />
      <BulletSection
        heading={i18n.FALSE_POSITIVES_HEADING}
        items={definition.guidance.expectedFalsePositives}
        testId="discoverHuntFalsePositives"
      />
      <BulletSection
        heading={i18n.PIVOTS_HEADING}
        items={definition.guidance.suggestedPivots}
        testId="discoverHuntPivots"
      />
      {definition.references.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>{i18n.REFERENCES_HEADING}</h4>
          </EuiTitle>
          <EuiText size="s">
            <ul data-test-subj="discoverHuntReferences">
              {definition.references.map((reference) => (
                <li key={reference}>
                  <EuiLink href={reference} target="_blank" external>
                    {reference}
                  </EuiLink>
                </li>
              ))}
            </ul>
          </EuiText>
        </>
      )}
    </EuiFlyoutBody>
  </EuiFlyout>
);
