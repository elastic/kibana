/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EuiToolTipRef } from '@elastic/eui';
import React, { useEffect, useRef, useState } from 'react';
import { FieldIcon } from '@kbn/react-field';
import { ensureWorkflowGraphEuiIcons, resolveNodeChipStyle } from '@kbn/workflows-ui';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import type { DataReferenceItem } from '../lib/build_data_reference_catalog';
import {
  isDataReferenceEntity,
  isDataReferenceInsertable,
} from '../lib/build_data_reference_catalog';

ensureWorkflowGraphEuiIcons();

const LABEL_TOOLTIP_DELAY_MS = 500;

/** Shows the full label in an EuiToolTip after a 0.5s hover (no native `title`). */
function DelayedLabelTooltip({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactElement;
}) {
  const tipRef = useRef<EuiToolTipRef>(null);
  const timerRef = useRef<number | null>(null);
  const [tipContent, setTipContent] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (tipContent) {
      tipRef.current?.showToolTip();
    } else {
      tipRef.current?.hideToolTip();
    }
  }, [tipContent]);

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <EuiToolTip
      ref={tipRef}
      content={tipContent}
      position="top"
      display="block"
      disableScreenReaderOutput
      repositionOnScroll
      anchorProps={{
        css: {
          display: 'block',
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
        },
        onMouseEnter: () => {
          if (timerRef.current != null) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => {
            setTipContent(label);
          }, LABEL_TOOLTIP_DELAY_MS);
        },
        onMouseLeave: () => {
          if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setTipContent(undefined);
        },
      }}
    >
      {children}
    </EuiToolTip>
  );
}

export function DataReferenceEntityIcon({ stepType }: { readonly stepType: string }) {
  const { euiTheme } = useEuiTheme();
  const chip = resolveNodeChipStyle(euiTheme, stepType, stepType.startsWith('trigger_'), {
    isSuccess: false,
    isFailed: false,
  });
  return (
    <span
      css={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: euiTheme.size.l,
        height: euiTheme.size.l,
        flex: '0 0 auto',
        borderRadius: euiTheme.border.radius.small,
        border: `1px solid ${chip.border}`,
        background: chip.background,
      }}
    >
      {/*
        Match canvas / Actions menu glyph tinting: mask-based StepIcons honor
        `iconColor`, but EUI-registered glyphs (e.g. `branch`) need the SVG fill
        wrapper used by NodeStepIcon.
      */}
      <span
        css={[
          { color: chip.iconColor, display: 'inline-flex', lineHeight: 0 },
          chip.iconColor ? { '& svg, & svg *': { fill: chip.iconColor } } : undefined,
        ]}
      >
        <StepIcon
          stepType={stepType}
          executionStatus={undefined}
          size="s"
          iconColor={chip.iconColor}
          color={chip.iconColor}
        />
      </span>
    </span>
  );
}

export function DataReferenceItemRowContent({
  item,
  showOrigin,
  hideChevron,
}: {
  readonly item: DataReferenceItem;
  readonly showOrigin?: boolean;
  /** Accordion trees use a left disclosure — hide the trailing chevron. */
  readonly hideChevron?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const isEntity = isDataReferenceEntity(item);

  if (isEntity) {
    return (
      <>
        {item.iconStepType ? <DataReferenceEntityIcon stepType={item.iconStepType} /> : null}
        <span
          css={{
            minWidth: 0,
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <EuiText size="xs" css={{ fontWeight: euiTheme.font.weight.medium }}>
            <DelayedLabelTooltip label={item.label}>
              <span
                css={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </DelayedLabelTooltip>
          </EuiText>
          {item.subtitle ? (
            <EuiText size="xs" color="subdued">
              <DelayedLabelTooltip label={item.subtitle}>
                <span
                  css={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.subtitle}
                </span>
              </DelayedLabelTooltip>
            </EuiText>
          ) : null}
        </span>
        {!hideChevron ? (
          <EuiIcon
            type="chevronSingleRight"
            size="s"
            color="subdued"
            aria-hidden
            css={{ flexShrink: 0 }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <span
        css={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Match DataReferenceEntityIcon footprint so token glyphs line up
          // with step chips in the same tree.
          width: 24,
          height: 24,
          flex: '0 0 auto',
        }}
        aria-hidden
      >
        <FieldIcon type={item.typeLabel} size="s" shape="square" />
      </span>
      <span
        css={{
          minWidth: 0,
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          justifyContent: 'center',
        }}
      >
        {showOrigin ? (
          <EuiText size="xs" color="subdued">
            {item.originLabel}
          </EuiText>
        ) : null}
        <EuiText
          size="xs"
          css={{
            fontWeight: euiTheme.font.weight.medium,
            fontFamily: euiTheme.font.familyCode,
          }}
        >
          <DelayedLabelTooltip label={item.label}>
            <span
              css={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </span>
          </DelayedLabelTooltip>
        </EuiText>
        {item.subtitle ? (
          <EuiText size="xs" color="subdued">
            <DelayedLabelTooltip label={item.subtitle}>
              <span
                css={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.subtitle}
              </span>
            </DelayedLabelTooltip>
          </EuiText>
        ) : null}
      </span>
      {isDataReferenceInsertable(item) ? (
        <EuiBadge color="hollow" css={{ flexShrink: 0 }} data-drag-preview-hide>
          {item.typeLabel}
        </EuiBadge>
      ) : null}
      {!hideChevron && item.drillable ? (
        <EuiIcon
          type="chevronSingleRight"
          size="s"
          color="subdued"
          aria-hidden
          css={{ flexShrink: 0 }}
        />
      ) : null}
    </>
  );
}

export { isDataReferenceEntity, isDataReferenceInsertable };
