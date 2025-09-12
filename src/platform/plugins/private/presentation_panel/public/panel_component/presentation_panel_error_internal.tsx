/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, Subscription, switchMap } from 'rxjs';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useErrorTextStyle } from '@kbn/react-hooks';
import { renderSearchError } from '@kbn/search-errors';
import { Markdown } from '@kbn/shared-ux-markdown';
import type { ActionExecutionMeta } from '@kbn/ui-actions-plugin/public';

import { uiActions } from '../kibana_services';
import { CONTEXT_MENU_TRIGGER } from '../panel_actions';
import { ACTION_EDIT_PANEL } from '../panel_actions/edit_panel_action/constants';
import { executeEditPanelAction } from '../panel_actions/edit_panel_action/execute_edit_action';
import type { DefaultPresentationPanelApi } from './types';

export interface PresentationPanelErrorProps {
  error: ErrorLike;
  api?: DefaultPresentationPanelApi;
  panelRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export const PresentationPanelErrorInternal = ({
  api,
  error,
  panelRef,
}: PresentationPanelErrorProps) => {
  const errorTextStyle = useErrorTextStyle();
  const { euiTheme } = useEuiTheme();

  const [isEditable, setIsEditable] = useState(false);
  const handleErrorClick = useMemo(
    () => (isEditable ? () => executeEditPanelAction(api) : undefined),
    [api, isEditable]
  );
  const [label, setLabel] = useState('');
  const [panelSize, setPanelSize] = useState<{ width: number; height: number } | undefined>(
    undefined
  );

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!panelRef?.current) return;
      const { width, height } = panelRef?.current?.getBoundingClientRect();
      setPanelSize({ width, height });
    });
    if (panelRef?.current) observer.observe(panelRef?.current!);
  }, [panelRef]);

  useEffect(() => {
    if (!isEditable) {
      setLabel('');
      return;
    }

    const canceled = false;
    uiActions
      .getAction(ACTION_EDIT_PANEL)
      .then((action) => {
        if (canceled) return;
        setLabel(
          action?.getDisplayName({
            embeddable: api,
            trigger: { id: CONTEXT_MENU_TRIGGER },
          } as EmbeddableApiContext & ActionExecutionMeta)
        );
      })
      .catch(() => {
        // ignore action not found
      });
  }, [api, isEditable]);

  const panelTitle = useStateFromPublishingSubject(api?.title$ ?? new BehaviorSubject(undefined));
  const ariaLabel = useMemo(
    () =>
      panelTitle
        ? i18n.translate('presentationPanel.error.editButton', {
            defaultMessage: 'Edit {value}',
            values: { value: panelTitle },
          })
        : label,
    [label, panelTitle]
  );

  // Get initial editable state from action and subscribe to changes.
  useEffect(() => {
    let canceled = false;
    const subscription = new Subscription();
    (async () => {
      const editPanelAction = await uiActions.getAction(ACTION_EDIT_PANEL);
      const context = {
        embeddable: api,
        trigger: { id: CONTEXT_MENU_TRIGGER },
      };
      if (canceled || !editPanelAction?.couldBecomeCompatible?.(context)) return;

      const initiallyCompatible = await editPanelAction?.isCompatible(context);
      if (canceled) return;
      setIsEditable(initiallyCompatible);
      const compatibilitySubscription = editPanelAction
        ?.getCompatibilityChangesSubject?.(context)
        ?.pipe(
          switchMap(async () => {
            return await editPanelAction.isCompatible(context);
          })
        )
        .subscribe(async (isCompatible) => {
          if (!canceled) setIsEditable(isCompatible);
        });
      subscription.add(compatibilitySubscription);
    })();

    return () => {
      canceled = true;
      subscription.unsubscribe();
    };
  }, [api]);

  const searchErrorDisplay = renderSearchError(error);

  const actions = searchErrorDisplay?.actions ?? [];
  if (isEditable) {
    actions.push(
      <EuiButtonEmpty aria-label={ariaLabel} onClick={handleErrorClick} size="s">
        {label}
      </EuiButtonEmpty>
    );
  }

  const { isLandscape, isNarrow } = useMemo(() => {
    const { width, height } = panelSize ?? { width: Infinity, height: Infinity };
    return {
      isLandscape: width > height && height < euiTheme.breakpoint.s / 3,
      isNarrow: height < euiTheme.breakpoint.s / 10,
    };
  }, [panelSize, euiTheme.breakpoint.s]);

  return isNarrow ? (
    <NarrowError error={error} />
  ) : (
    <div
      data-test-subj="embeddableError"
      css={(theme) => [styles.fullWidth, styles.wrapperStyles(theme)]}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="m"
            alignItems="center"
            justifyContent="center"
            direction={isLandscape ? 'row' : 'column'}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon size="xl" type="error" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {searchErrorDisplay?.body ?? (
                <Markdown css={errorTextStyle} data-test-subj="errorMessageMarkdown" readOnly>
                  {error.message?.length
                    ? error.message
                    : i18n.translate('presentationPanel.emptyErrorMessage', {
                        defaultMessage: 'Error',
                      })}
                </Markdown>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={styles.actionStyles}>
          {actions}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const NarrowError = ({ error }: { error: ErrorLike }) => {
  const errorTextStyle = useErrorTextStyle();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverButton = (
    <EuiButtonEmpty
      color="danger"
      iconSize="m"
      iconType="error"
      onClick={() => setPopoverOpen((open) => !open)}
      css={[styles.fullWidth, styles.fullHeight]}
      size="s"
    >
      <FormattedMessage
        id="presentationPanel.error.popoverButton"
        defaultMessage="An error occurred. View more..."
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverOpen(false)}
      css={[styles.fullWidth, styles.fullHeight]}
      panelProps={{
        css: styles.popoverErrorStyles,
      }}
    >
      <Markdown data-test-subj="errorMessageMarkdown" readOnly css={errorTextStyle}>
        {error.message?.length
          ? error.message
          : i18n.translate('presentationPanel.emptyErrorMessage', {
              defaultMessage: 'Error',
            })}
      </Markdown>
    </EuiPopover>
  );
};

const styles = {
  fullWidth: css({
    width: '100%',
  }),
  fullHeight: css({
    height: '100%',
  }),
  actionStyles: css({
    alignItems: 'center',
    button: {
      width: 'fit-content',
    },
  }),
  wrapperStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      overflow: 'auto',
      margin: 'auto',
    }),
  popoverErrorStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxWidth: `calc(${euiTheme.size.xxxl} * 10)`,
    }),
};
