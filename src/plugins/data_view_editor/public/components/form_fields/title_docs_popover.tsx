/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
          max-height: 40vh;
          max-width: 500px;
        `}
        color="transparent"
        paddingSize="m"
      >
        <EuiText size="s" data-test-subj="indexPatternDocsPopoverContent">
          <p>
            <FormattedMessage
              id="indexPatternEditor.titleDocsPopover.startTypingDescription"
              defaultMessage="Start typing in the Index pattern field, and Kibana looks for the names of indices, data streams, and aliases that match your input."
            />
          </p>
          <ul>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useWildcardDescription"
                  defaultMessage="To match multiple sources, use a wildcard (*)."
                />
              </p>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useWildcardExample"
                  defaultMessage="{pattern} matches {index1}, {index2}, and so on."
                  values={{
                    pattern: <EuiCode>filebeat-*</EuiCode>,
                    index1: <EuiCode>filebeat-apache-a</EuiCode>,
                    index2: <EuiCode>filebeat-apache-b</EuiCode>,
                  }}
                />
              </p>
            </li>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useCommasDescription"
                  defaultMessage="To match multiple single sources, enter their names, separated by a comma. Do not include a space after the comma."
                />
              </p>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useCommasExample"
                  defaultMessage="{pattern} matches two indices"
                  values={{
                    pattern: <EuiCode>filebeat-a,filebeat-b</EuiCode>,
                  }}
                />
              </p>
            </li>
            <li>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useMinusDescription"
                  defaultMessage="To exclude a source, use a minus sign (-)."
                />
              </p>
              <p>
                <FormattedMessage
                  id="indexPatternEditor.titleDocsPopover.useMinusExample"
                  defaultMessage="For example, {pattern}."
                  values={{
                    pattern: <EuiCode>-test3</EuiCode>,
                  }}
                />
              </p>
            </li>
          </ul>
        </EuiText>
      </EuiPanel>
    </EuiPopover>
  );
};
