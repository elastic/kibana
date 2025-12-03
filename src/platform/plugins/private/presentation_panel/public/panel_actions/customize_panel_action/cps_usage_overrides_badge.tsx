/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  Action,
  ActionExecutionMeta,
  FrequentCompatibilityChangeAction,
} from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React, { useState } from 'react';
import { EuiPopover, EuiText, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiPublishesProjectRouting, apiHasParentApi } from '@kbn/presentation-publishing';
import { combineLatest, map } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { CPS_USAGE_OVERRIDES_BADGE } from './constants';
import { uiActions, core } from '../../kibana_services';
import { ACTION_EDIT_PANEL } from '../edit_panel_action/constants';
import { CONTEXT_MENU_TRIGGER } from '../triggers';

export class CpsUsageOverridesBadge
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = CPS_USAGE_OVERRIDES_BADGE;
  public readonly id = CPS_USAGE_OVERRIDES_BADGE;
  public order = 8;

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!apiPublishesProjectRouting(embeddable)) {
      throw new IncompatibleActionError();
    }

    const overrideValue = embeddable.projectRouting$.value;

    return i18n.translate('presentationPanel.badge.cpsUsageOverrides.displayName', {
      defaultMessage: 'This panel overrides the dashboard CPS scope with: {value}',
      values: {
        value: overrideValue,
      },
    });
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    if (!this.hasOverride(embeddable)) throw new IncompatibleActionError();

    if (!apiPublishesProjectRouting(embeddable)) {
      throw new IncompatibleActionError();
    }

    const overrideValue = embeddable.projectRouting$.value;
    const badgeLabel = i18n.translate('presentationPanel.badge.cpsUsageOverrides.label', {
      defaultMessage: 'CPS overrides',
    });

    const handleEditClick = async () => {
      setIsPopoverOpen(false);
      try {
        const action = await uiActions.getAction(ACTION_EDIT_PANEL);
        if (action) {
          await action.execute({
            ...context,
            trigger: { id: CONTEXT_MENU_TRIGGER },
          });
        }
      } catch (error) {
        core.notifications.toasts.addError(error, {
          title: i18n.translate('presentationPanel.badge.cpsUsageOverrides.editError', {
            defaultMessage: 'Failed to open panel configuration',
          }),
        });
      }
    };

    return (
      <EuiPopover
        button={<button onClick={() => setIsPopoverOpen(!isPopoverOpen)}>{badgeLabel}</button>}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downCenter"
        panelStyle={{ minWidth: 250 }}
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.title', {
                  defaultMessage: 'CPS Override',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleEditClick}
              size="s"
              data-test-subj="cpsUsageOverridesEditButton"
              flush="right"
            >
              {i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.editButton', {
                defaultMessage: 'Edit',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s">
          {overrideValue === 'ALL'
            ? i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.allProjects', {
                defaultMessage: 'All projects',
              })
            : overrideValue}
        </EuiText>
      </EuiPopover>
    );
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return (
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi)
    );
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    if (
      apiPublishesProjectRouting(embeddable) &&
      apiHasParentApi(embeddable) &&
      apiPublishesProjectRouting(embeddable.parentApi)
    ) {
      return combineLatest([embeddable.projectRouting$, embeddable.parentApi.projectRouting$]).pipe(
        map(() => undefined)
      );
    }
    return undefined;
  }

  public async execute(_context: ActionExecutionMeta & EmbeddableApiContext) {
    // Badge is informational only - clicking shows tooltip but doesn't navigate
    return;
  }

  public getIconType() {
    return 'beaker';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    return this.hasOverride(embeddable);
  }

  private hasOverride(embeddable: unknown): boolean {
    if (!apiPublishesProjectRouting(embeddable)) {
      return false;
    }
    return embeddable.projectRouting$.value !== undefined;
  }
}
