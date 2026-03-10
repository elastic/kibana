/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { ApproximateResultsControl } from '../types';

const fastResultsLabel = i18n.translate('esqlEditor.query.fastResultsLabel', {
  defaultMessage: 'Fast results',
});

const popoverTitle = i18n.translate('esqlEditor.query.fastQueryAnalyticsTitle', {
  defaultMessage: 'Fast Query Analytics',
});

const popoverDescription = i18n.translate('esqlEditor.query.fastQueryAnalyticsDescription', {
  defaultMessage:
    'Use approximate execution to return faster, estimated results (\u224890% confidence).',
});

const popoverDisclaimer = i18n.translate('esqlEditor.query.fastQueryAnalyticsDisclaimer', {
  defaultMessage: 'Results may differ slightly from exact results.',
});

const toggleOnLabel = i18n.translate('esqlEditor.query.fastResultsOnLabel', {
  defaultMessage: 'On',
});

const toggleOffLabel = i18n.translate('esqlEditor.query.fastResultsOffLabel', {
  defaultMessage: 'Off',
});

const POPOVER_WIDTH = 320;

const TOGGLE_ON_ID = 'fast-results-on';
const TOGGLE_OFF_ID = 'fast-results-off';

export function FastResultsToggle({
  approximateResultsControl,
}: {
  approximateResultsControl: ApproximateResultsControl;
}) {
  const { euiTheme } = useEuiTheme();
  const { enabled, onChange } = approximateResultsControl;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const toggleButtons = useMemo(
    () => [
      { id: TOGGLE_ON_ID, label: toggleOnLabel },
      { id: TOGGLE_OFF_ID, label: toggleOffLabel },
    ],
    []
  );

  const selectedId = enabled ? TOGGLE_ON_ID : TOGGLE_OFF_ID;

  const onToggleChange = useCallback(
    (id: string) => {
      onChange(id === TOGGLE_ON_ID);
    },
    [onChange]
  );

  const statusLabel = enabled
    ? i18n.translate('esqlEditor.query.fastResultsStatusOn', { defaultMessage: 'on' })
    : i18n.translate('esqlEditor.query.fastResultsStatusOff', { defaultMessage: 'off' });

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiButtonEmpty
            size="xs"
            color="text"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            data-test-subj="ESQLEditor-fastResults-button"
            css={css`
              font-size: ${euiTheme.size.m};
            `}
          >
            {`${fastResultsLabel}: ${statusLabel}`}
          </EuiButtonEmpty>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="m"
        anchorPosition="downCenter"
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={css`
            max-width: ${POPOVER_WIDTH}px;
          `}
        >
          <EuiFlexItem>
            <EuiText size="s">
              <p>
                <strong>{popoverTitle}</strong>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <p>{popoverDescription}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              <p>{popoverDisclaimer}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="bolt" size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{fastResultsLabel}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={fastResultsLabel}
                  options={toggleButtons}
                  idSelected={selectedId}
                  onChange={onToggleChange}
                  buttonSize="compressed"
                  data-test-subj="ESQLEditor-fastResults-buttonGroup"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopover>
    </EuiFlexItem>
  );
}
