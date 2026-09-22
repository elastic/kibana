/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useOptionalRunAsPrototype } from './context';

export const RunAsPill = () => {
  const ctx = useOptionalRunAsPrototype();
  const { euiTheme } = useEuiTheme();

  const content = useMemo(() => {
    if (!ctx) {
      return null;
    }
    const { bindingStatus, draftRunAs, canBind } = ctx;

    if (bindingStatus === 'none') {
      return {
        color: 'hollow' as const,
        iconType: 'user' as IconType,
        tip: canBind
          ? i18n.translate('workflows.runAsPrototype.pill.noneTipCanBind', {
              defaultMessage:
                'Runs as whoever or whatever triggers it. Choose a service account to give this workflow its own identity.',
            })
          : i18n.translate('workflows.runAsPrototype.pill.noneTipLocked', {
              defaultMessage:
                'Runs as whoever or whatever triggers it. Binding a service account requires manage_security.',
            }),
        label: i18n.translate('workflows.runAsPrototype.pill.none', {
          defaultMessage: 'No service account',
        }),
      };
    }

    if (bindingStatus === 'ok') {
      return {
        color: 'hollow' as const,
        iconType: 'compute' as IconType,
        tip: canBind
          ? i18n.translate('workflows.runAsPrototype.pill.okTipCanBind', {
              defaultMessage:
                'Every run executes with this account’s privileges. Change or remove the binding.',
            })
          : i18n.translate('workflows.runAsPrototype.pill.okTipLocked', {
              defaultMessage:
                'Every run executes with this account’s privileges. Changing the binding requires manage_security.',
            }),
        label: (
          <>
            <span>
              {i18n.translate('workflows.runAsPrototype.pill.runsAs', {
                defaultMessage: 'Runs as',
              })}
            </span>
            <code css={{ fontFamily: euiTheme.font.familyCode, fontSize: 11 }}>{draftRunAs}</code>
          </>
        ),
      };
    }

    if (bindingStatus === 'unauthorized') {
      return {
        color: 'warning' as const,
        iconType: 'warning' as IconType,
        tip: i18n.translate('workflows.runAsPrototype.pill.unauthorizedTip', {
          defaultMessage:
            'This workflow references an account it was never authorized to use. Runs will fail until someone with manage_security rebinds it.',
        }),
        label: (
          <>
            <code css={{ fontFamily: euiTheme.font.familyCode, fontSize: 11 }}>{draftRunAs}</code>
            <span>
              {i18n.translate('workflows.runAsPrototype.pill.notAuthorized', {
                defaultMessage: '· not authorized',
              })}
            </span>
          </>
        ),
      };
    }

    return {
      color: 'danger' as const,
      iconType: 'warning' as IconType,
      tip: i18n.translate('workflows.runAsPrototype.pill.missingTip', {
        defaultMessage:
          'The bound service account was deleted. Runs will fail until it is replaced or removed.',
      }),
      label: (
        <>
          <code css={{ fontFamily: euiTheme.font.familyCode, fontSize: 11 }}>{draftRunAs}</code>
          <span>
            {i18n.translate('workflows.runAsPrototype.pill.notFound', {
              defaultMessage: '· not found',
            })}
          </span>
        </>
      ),
    };
  }, [ctx, euiTheme.font.familyCode]);

  if (!ctx || !content) {
    return null;
  }

  return (
    <EuiToolTip content={content.tip}>
      <EuiBadge
        color={content.color}
        iconType={content.iconType}
        iconSide="left"
        onClick={ctx.openIdentityModal}
        onClickAriaLabel={i18n.translate('workflows.runAsPrototype.pill.ariaLabel', {
          defaultMessage: 'Execution identity',
        })}
        css={{
          height: 24,
          paddingInline: euiTheme.size.s,
          cursor: ctx.canBind ? 'pointer' : 'not-allowed',
          opacity: ctx.canBind ? 1 : 0.75,
          '.euiBadge__content': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          },
          '.euiBadge__icon': {
            marginInlineEnd: 0,
          },
        }}
        data-test-subj="workflowRunAsPill"
      >
        {content.label}
      </EuiBadge>
    </EuiToolTip>
  );
};
