/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormLabel, EuiPopover, EuiIcon, EuiToolTip, EuiLink } from '@elastic/eui';
import useToggle from 'react-use/lib/useToggle';
import { css } from '@emotion/react';
import { ControlInput } from '../../types';

const TitleWithPopoverMessage = ({
  title,
  helpMessage,
  embeddableId,
}: {
  title?: string;
  helpMessage: ControlInput['helpMessage'];
  embeddableId: string;
}) => {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  return helpMessage?.text ? (
    <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
      <>
        {title}
        <EuiPopover
          panelPaddingSize="s"
          button={
            <EuiIcon
              data-test-subj={`control-group-help-message-${embeddableId}`}
              type="iInCircle"
              size="m"
              onClick={togglePopover}
              css={css`
                cursor: pointer;
                margin: 0 2px 2px;
              `}
            />
          }
          isOpen={isPopoverOpen}
          offset={10}
          closePopover={() => togglePopover(false)}
          repositionOnScroll
          anchorPosition="upCenter"
          panelStyle={{ maxWidth: 250 }}
        >
          {helpMessage?.link ? (
            <>
              {helpMessage.text}{' '}
              <EuiLink
                data-test-subj={helpMessage.link['data-test-subj']}
                href={helpMessage.link.href}
                target="_blank"
              >
                {helpMessage.link.text}
              </EuiLink>
            </>
          ) : (
            <>{helpMessage.text}</>
          )}
        </EuiPopover>
      </>
    </EuiFormLabel>
  ) : null;
};

export const ControlTitle = ({
  title,
  helpMessage,
  embeddableId,
}: {
  helpMessage?: ControlInput['helpMessage'];
  title?: string;
  embeddableId: string;
}) => {
  return helpMessage ? (
    <TitleWithPopoverMessage title={title} helpMessage={helpMessage} embeddableId={embeddableId} />
  ) : (
    <EuiToolTip anchorClassName="controlFrame__labelToolTip" content={title}>
      <EuiFormLabel className="controlFrame__formControlLayoutLabel" htmlFor={embeddableId}>
        {title}
      </EuiFormLabel>
    </EuiToolTip>
  );
};
