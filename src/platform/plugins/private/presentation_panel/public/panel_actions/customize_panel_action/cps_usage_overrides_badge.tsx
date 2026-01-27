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
import { map } from 'rxjs';
import {
  EuiPopover,
  EuiText,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  useEuiTheme,
} from '@elastic/eui';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  apiPublishesProjectRoutingOverrides,
  type ProjectRoutingOverrides,
} from '@kbn/presentation-publishing';
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
    const overrideValues = this.getOverrideValues(embeddable);
    if (!overrideValues || overrideValues.length === 0) {
      throw new IncompatibleActionError();
    }
    return strings.displayName;
  }

  public readonly MenuItem = ({ context }: { context: EmbeddableApiContext }) => {
    const { embeddable } = context;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const { euiTheme } = useEuiTheme();
    const overrideValues = this.getOverrideValues(embeddable);
    if (!overrideValues || overrideValues.length === 0) throw new IncompatibleActionError();

    return (
      <EuiPopover
        button={
          <button onClick={() => setIsPopoverOpen(!isPopoverOpen)}>{strings.badgeLabel}</button>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downCenter"
        panelStyle={{ minWidth: 250 }}
        panelPaddingSize="none"
      >
        <div css={{ padding: euiTheme.size.m }}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText size="xs" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
                {strings.badgeLabel}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={async () => {
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
                      title: strings.error,
                    });
                  }
                }}
                size="xs"
                flush="right"
              >
                {strings.editButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          {overrideValues.map((override, index) => (
            <div key={index} css={{ marginTop: index > 0 ? euiTheme.size.s : 0 }}>
              {override.name && (
                <EuiText size="xs" css={{ marginBottom: euiTheme.size.xs }}>
                  {override.name}
                </EuiText>
              )}
              <EuiCodeBlock paddingSize="s">{override.value}</EuiCodeBlock>
            </div>
          ))}
        </div>
      </EuiPopover>
    );
  };

  public async execute(_context: ActionExecutionMeta & EmbeddableApiContext) {
    return;
  }

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiPublishesProjectRoutingOverrides(embeddable);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return apiPublishesProjectRoutingOverrides(embeddable)
      ? embeddable.projectRoutingOverrides$.pipe(map(() => undefined))
      : undefined;
  }

  public getIconType() {
    return 'crossProjectSearch';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    const values = this.getOverrideValues(embeddable);
    return values !== undefined && values.length > 0;
  }

  private getOverrideValues(embeddable: unknown): ProjectRoutingOverrides {
    if (apiPublishesProjectRoutingOverrides(embeddable)) {
      return embeddable.projectRoutingOverrides$.getValue();
    }
    return undefined;
  }
}

const strings = {
  badgeLabel: i18n.translate('presentationPanel.badge.cpsUsageOverrides.label', {
    defaultMessage: 'CPS overrides',
  }),
  displayName: i18n.translate('presentationPanel.badge.cpsUsageOverrides.displayName', {
    defaultMessage: 'This panel overrides the CPS scope',
  }),
  editButton: i18n.translate('presentationPanel.badge.cpsUsageOverrides.popover.editButton', {
    defaultMessage: 'Edit',
  }),
  error: i18n.translate('presentationPanel.badge.cpsUsageOverrides.editError', {
    defaultMessage: 'Failed to open panel configuration',
  }),
};
