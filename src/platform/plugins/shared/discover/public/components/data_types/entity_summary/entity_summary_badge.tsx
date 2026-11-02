/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { EuiBadge, EuiPopover, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { getFieldValue, type DataTableRecord } from '@kbn/discover-utils';
import { EntitySummary, type EntitySummaryLink } from '@kbn/discover-contextual-components';
import type { ContextAwarenessToolkit } from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useFetchEntitySummary } from './use_fetch_entity_summary';
import type { EntitySummaryDefinition } from './types';
// TEMPORARY DEMO ONLY — remove with `entity_summary_layout_demo.tsx` before shipping.
import { ensureLayoutDemoMounted, useLayoutDemoDirection } from './entity_summary_layout_demo';

const badgeStyle = css`
  max-width: 100%;
`;

const triggerWrapperStyle = css`
  display: inline-flex;
  max-width: 100%;
`;

// Grace period so the pointer can cross the gap between the badge and the popover panel without the
// popover snapping shut; entering the badge or the panel cancels the pending close.
const HOVER_CLOSE_DELAY_MS = 150;

export interface EntitySummaryBadgeProps<RawData = unknown> {
  row: DataTableRecord;
  fieldName: string;
  definition: EntitySummaryDefinition<RawData>;
  toolkit: ContextAwarenessToolkit;
  /** Optional pre-formatted trigger label (e.g. search-highlighted). Falls back to the entity label. */
  formattedLabel?: ReactNode;
  'data-test-subj'?: string;
}

/**
 * Entity-agnostic chip that opens a summary popover on click, driven by an `EntitySummaryDefinition`.
 *
 * The definition resolves the entity from the row, fetches its concrete data through the
 * `discover_shared` registry (lazily, only while the popover is open), and maps it into the generic
 * popover content. Profiles can reshape the links via `definition.customizeLinks`. Rendered both as
 * a dedicated column cell and (via `renderResourceBadge`) as the chip inside the summary column.
 */
export const EntitySummaryBadge = <RawData,>({
  row,
  fieldName,
  definition,
  toolkit,
  formattedLabel,
  'data-test-subj': dataTestSubj = 'entitySummaryBadge',
}: EntitySummaryBadgeProps<RawData>) => {
  const services = useDiscoverServices();
  const [isPopoverOpen, { on: showPopover, off: closePopover }] = useBoolean(false);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openOnHover = useCallback(() => {
    cancelScheduledClose();
    showPopover();
  }, [cancelScheduledClose, showPopover]);

  const closeOnHoverOut = useCallback(() => {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(closePopover, HOVER_CLOSE_DELAY_MS);
  }, [cancelScheduledClose, closePopover]);

  useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

  // TEMPORARY DEMO ONLY — mounts the floating layout toggle and reads its current selection.
  useEffect(() => {
    ensureLayoutDemoMounted();
  }, []);
  const metricsDirection = useLayoutDemoDirection();

  const entity = useMemo(
    () => definition.getEntity({ row, fieldName }),
    [definition, row, fieldName]
  );

  const { loading, data } = useFetchEntitySummary<RawData>({
    definition,
    entity,
    enabled: isPopoverOpen && Boolean(entity),
  });

  const content = useMemo(
    () => (entity ? definition.mapToContent({ data, entity }) : undefined),
    [definition, data, entity]
  );

  const links = useMemo<EntitySummaryLink[]>(() => {
    if (!entity || !content) {
      return [];
    }

    const customized = definition.customizeLinks
      ? definition.customizeLinks(content.links, { data, entity, services })
      : content.links;

    // Close the popover when a link is followed, preserving any link-specific handler.
    return customized.map((link) => ({
      ...link,
      onClick: () => {
        link.onClick?.();
        closePopover();
      },
    }));
  }, [content, definition, data, entity, services, closePopover]);

  if (!entity) {
    return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
  }

  const { label, subtitle, iconTooltip, renderIcon } = entity;
  const triggerIcon = renderIcon?.('s');
  const headerIcon = renderIcon?.('l');

  const onFilter = (operator: '+' | '-') => () => {
    toolkit.actions.addFilter?.(fieldName, getFieldValue(row, fieldName), operator);
    closePopover();
  };

  const onCopyValue = () => {
    void navigator.clipboard?.writeText(entity.identifier);
    closePopover();
  };

  const trigger = (
    <span css={triggerWrapperStyle} onMouseEnter={openOnHover} onMouseLeave={closeOnHoverOut}>
      <EuiBadge
        color="hollow"
        css={badgeStyle}
        onClick={showPopover}
        onClickAriaLabel={i18n.translate('discover.entitySummaryBadge.openAriaLabel', {
          defaultMessage: 'Open summary for {entity}',
          values: { entity: label },
        })}
        data-test-subj={`${dataTestSubj}-badge`}
      >
        {triggerIcon ? (
          iconTooltip ? (
            <EuiToolTip position="left" content={iconTooltip} repositionOnScroll>
              {triggerIcon}
            </EuiToolTip>
          ) : (
            triggerIcon
          )
        ) : null}{' '}
        {formattedLabel ?? label}
      </EuiBadge>
    </span>
  );

  return (
    <EuiPopover
      button={trigger}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelProps={{ onMouseEnter: openOnHover, onMouseLeave: closeOnHoverOut }}
      aria-label={i18n.translate('discover.entitySummaryBadge.popoverAriaLabel', {
        defaultMessage: 'Summary for {entity}',
        values: { entity: label },
      })}
      data-test-subj={dataTestSubj}
    >
      <EntitySummary
        title={label}
        subtitle={subtitle}
        titleHref={content?.titleHref}
        icon={headerIcon}
        metrics={content?.metrics ?? []}
        metricsDirection={metricsDirection}
        links={links}
        isLoading={loading}
        onClose={closePopover}
        onFilterFor={onFilter('+')}
        onFilterOut={onFilter('-')}
        onCopyValue={onCopyValue}
      />
    </EuiPopover>
  );
};
