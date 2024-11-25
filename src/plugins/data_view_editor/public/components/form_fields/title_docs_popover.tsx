/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const TitleDocsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const helpButton = (
    <EuiButtonIcon
      onClick={() => setIsOpen((prev) => !prev)}
      iconType="documentation"
      data-test-subj="indexPatternDocsButton"
      aria-label={i18n.translate('indexPatternEditor.titleDocsPopover.ariaLabel', {
        defaultMessage: 'Index pattern examples',
      })}
    />
  );

  return (
    <EuiPopover
      button={helpButton}
      isOpen={isOpen}
      display="inlineBlock"
      panelPaddingSize="none"
      anchorPosition="upRight"
      closePopover={() => setIsOpen(false)}
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('indexPatternEditor.titleDocsPopover.title', {
          defaultMessage: 'Index pattern',
        })}
      </EuiPopoverTitle>
      <EuiPanel
        className="eui-yScroll"
        css={css`
          max-height: 50vh;
          max-width: 500px;
        `}
        color="transparent"
        paddingSize="m"
      >
        <EuiText size="s" data-test-subj="indexPatternDocsPopoverContent">
          <p>
            <FormattedMessage
              id="indexPatternEditor.titleDocsPopover.indexPatternDescription"
              defaultMessage="An index pattern is a string that you use to match one or more data streams, indices, or aliases."
            />
          </p>
          <ul>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useWildcardDescription"
                  defaultMessage="Match multiple sources with a wildcard (*)."
                />
              </p>
              <p>
                <EuiCode>filebeat-*</EuiCode>
              </p>
            </li>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useCommasDescription"
                  defaultMessage="Separate multiple single sources with a comma (,)."
                />
              </p>
              <p>
                <EuiCode>filebeat-a,filebeat-b</EuiCode>
              </p>
            </li>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useMinusDescription"
                  defaultMessage="Exclude a source by preceding it with a minus sign (-)."
                />
              </p>
              <p>
                <EuiCode>filebeat-*,-filebeat-c</EuiCode>
              </p>
            </li>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useCrossClusterSearchDescription"
                  defaultMessage="For cross-cluster search, precede with the cluster name followed by a colon (:)."
                />
              </p>
              <p>
                <EuiCode>cluster1:filebeat-*</EuiCode>
              </p>
              <p>
                <EuiCode>cluster1:filebeat-*,cluster2:filebeat-*</EuiCode>
              </p>
              <p>
                <EuiCode>cluster*:filebeat-*,filebeat-*</EuiCode>
              </p>
            </li>
            <li>
              <p>
                {i18n.translate(
                  'indexPatternEditor.titleDocsPopover.dontUseSpecialCharactersDescription',
                  {
                    defaultMessage: 'Spaces and the characters /?"<>| are not allowed.',
                  }
                )}
              </p>
            </li>
          </ul>
        </EuiText>
      </EuiPanel>
    </EuiPopover>
  );
};
