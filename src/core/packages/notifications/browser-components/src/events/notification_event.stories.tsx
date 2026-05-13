/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { EuiContextMenuItem, EuiPanel } from '@elastic/eui';
import { NotificationEvent, type NotificationEventProps } from './notification_event';

// Extra synthetic args that control derived props in the template but are not
// passed directly to NotificationEvent.
interface ExtraArgs {
  showPrimaryAction: boolean;
  showContextMenu: boolean;
  primaryActionIconType: string;
  primaryActionHref: string;
}

type StoryArgs = NotificationEventProps & ExtraArgs;

const ICON_OPTIONS = ['download', 'share', 'link', 'eye', 'trash', 'bell', 'inspect'] as const;

const meta: Meta<StoryArgs> = {
  title: 'Notifications/Event',
  component: NotificationEvent as React.ComponentType<StoryArgs>,
  argTypes: {
    // ── Component props ───────────────────────────────────────────────────────
    type: {
      options: ['Report', 'Alert', 'Cloud', 'info', 'warning', 'error'],
      control: { type: 'select' },
    },
    isRead: { control: { type: 'boolean' } },
    isPinned: { control: { type: 'boolean' } },

    // ── Synthetic controls ────────────────────────────────────────────────────
    showPrimaryAction: {
      control: { type: 'boolean' },
      description: 'Show or hide the primary action button.',
    },
    showContextMenu: {
      control: { type: 'boolean' },
      description: 'Show or hide the context menu ("⋮") button.',
    },
    primaryActionIconType: {
      options: ICON_OPTIONS,
      control: { type: 'select' },
      description: 'Icon displayed inside the primary action button.',
      if: { arg: 'showPrimaryAction' },
    },
    primaryActionHref: {
      control: { type: 'text' },
      description: 'When set, the primary action button renders as an anchor tag.',
      if: { arg: 'showPrimaryAction' },
    },

    // ── Hide derived / function props from the controls panel ─────────────────
    primaryAction: { table: { disable: true } },
    primaryActionProps: { table: { disable: true } },
    onClickPrimaryAction: { table: { disable: true } },
    onOpenContextMenu: { table: { disable: true } },
    onClickTitle: { table: { disable: true } },
  },
};

export default meta;

const baseArgs = {
  id: '1234',
  type: 'Report',
  iconType: 'logoKibana',
  iconAriaLabel: 'Kibana',
  time: '1 min ago',
  title: '[Error Monitoring Report] is generated',
  messages: ['The reported was generated at 17:12:16 GMT+4'],
};

const Template: StoryFn<StoryArgs> = ({
  // Synthetic args
  showPrimaryAction,
  showContextMenu,
  primaryActionIconType,
  primaryActionHref,
  // Component args
  title = baseArgs.title,
  isRead: isReadArg = false,
  isPinned: isPinnedArg = false,
  ...args
}) => {
  const [isRead, setIsRead] = useState(isReadArg);
  const [isPinned, setIsPinned] = useState(isPinnedArg);
  // Keep local state in sync when the controls panel changes the args.
  useEffect(() => {
    setIsRead(isReadArg);
  }, [isReadArg]);
  useEffect(() => {
    setIsPinned(isPinnedArg);
  }, [isPinnedArg]);

  const onOpenContextMenu = showContextMenu
    ? (_id: string) => [
        <EuiContextMenuItem
          key="read"
          onClick={() => {
            setIsRead(!isRead);
            action('mark-as-read')(!isRead);
          }}
        >
          {isRead ? 'Mark as Unread' : 'Mark as Read'}
        </EuiContextMenuItem>,
        <EuiContextMenuItem key="delete" onClick={action('delete')}>
          Delete
        </EuiContextMenuItem>,
      ]
    : undefined;

  return (
    <EuiPanel paddingSize="none" hasShadow={true} style={{ maxWidth: '540px' }}>
      <NotificationEvent
        {...baseArgs}
        {...args}
        title={title}
        isRead={isRead}
        isPinned={isPinned}
        onPin={(_id, currentlyPinned) => {
          setIsPinned(!currentlyPinned);
          action('on-pin')(!currentlyPinned);
        }}
        onClickTitle={() => {
          setIsRead(true);
          window.alert(title);
        }}
        primaryAction={showPrimaryAction ? 'Download' : undefined}
        primaryActionProps={
          showPrimaryAction
            ? {
                iconType: primaryActionIconType,
                href: primaryActionHref || undefined,
              }
            : undefined
        }
        onClickPrimaryAction={showPrimaryAction ? action('primary-action-clicked') : undefined}
        onOpenContextMenu={onOpenContextMenu}
      />
    </EuiPanel>
  );
};

export const Event: StoryFn<StoryArgs> = Template.bind({});
Event.args = {
  isRead: false,
  showPrimaryAction: true,
  showContextMenu: true,
  primaryActionIconType: 'download',
  primaryActionHref: '',
};

// set the name of the Event story to "NotificationEvent" instead of the default "Event"
Event.storyName = 'NotificationEvent';
