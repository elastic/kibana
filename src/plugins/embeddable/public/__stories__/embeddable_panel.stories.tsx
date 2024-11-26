/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { ReplaySubject } from 'rxjs';
import { ThemeContext } from '@emotion/react';
import { DecoratorFn, Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CoreTheme } from '@kbn/core-theme-browser';
import type { Action } from '@kbn/ui-actions-plugin/public';

import { CONTEXT_MENU_TRIGGER, EmbeddablePanel, PANEL_BADGE_TRIGGER, ViewMode } from '..';
import { actions } from '../store';
import { HelloWorldEmbeddable } from './hello_world_embeddable';

const layout: DecoratorFn = (story) => {
  return (
    <EuiFlexGroup direction="row" justifyContent="center">
      <EuiFlexItem grow={false} style={{ height: 300, width: 500 }}>
        {story()}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export default {
  title: 'components/EmbeddablePanel',
  argTypes: {
    hideHeader: {
      name: 'Hide Header',
      control: { type: 'boolean' },
    },
    loading: {
      name: 'Loading',
      control: { type: 'boolean' },
    },
    showShadow: {
      name: 'Show Shadow',
      control: { type: 'boolean' },
    },
    title: {
      name: 'Title',
      control: { type: 'text' },
    },
    viewMode: {
      name: 'View Mode',
      control: { type: 'boolean' },
    },
  },
  decorators: [layout],
} as Meta;

interface HelloWorldEmbeddablePanelProps {
  getActions?(type: string): Promise<Action[]>;
  hideHeader: boolean;
  loading: boolean;
  showShadow: boolean;
  showBorder: boolean;
  title: string;
  viewMode: boolean;
}

const HelloWorldEmbeddablePanel = forwardRef<
  { embeddable: HelloWorldEmbeddable },
  HelloWorldEmbeddablePanelProps
>(
  (
    {
      getActions,
      hideHeader,
      loading,
      showShadow,
      showBorder,
      title,
      viewMode,
    }: HelloWorldEmbeddablePanelProps,
    ref
  ) => {
    const embeddable = useMemo(() => new HelloWorldEmbeddable({ id: `${Math.random()}` }, {}), []);
    const theme$ = useMemo(() => new ReplaySubject<CoreTheme>(1), []);
    const theme = useContext(ThemeContext) as CoreTheme;

    useEffect(() => theme$.next(theme), [theme$, theme]);
    useEffect(() => {
      embeddable.store.dispatch(actions.input.setTitle(title));
    }, [embeddable.store, title]);
    useEffect(() => {
      embeddable.store.dispatch(
        actions.input.setViewMode(viewMode ? ViewMode.VIEW : ViewMode.EDIT)
      );
    }, [embeddable.store, viewMode]);
    useEffect(
      () => void embeddable.store.dispatch(actions.output.setLoading(loading)),
      [embeddable, loading]
    );
    useImperativeHandle(ref, () => ({ embeddable }));

    return (
      <EmbeddablePanel
        embeddable={embeddable}
        getActions={getActions}
        hideHeader={hideHeader}
        showShadow={showShadow}
        showBorder={showBorder}
      />
    );
  }
);

export const Default = HelloWorldEmbeddablePanel as Meta<HelloWorldEmbeddablePanelProps>;

Default.args = {
  hideHeader: false,
  loading: false,
  showShadow: false,
  showBorder: false,
  title: 'Hello World',
  viewMode: true,
};

interface DefaultWithBadgesProps extends HelloWorldEmbeddablePanelProps {
  badges: string[];
}

export function DefaultWithBadges({ badges, ...props }: DefaultWithBadgesProps) {
  const getActions = useCallback(
    async (type: string) => {
      switch (type) {
        case PANEL_BADGE_TRIGGER:
          return (
            badges?.map<Action>((badge, id) => ({
              execute: async (...args) => action(`onClick(${badge})`)(...args),
              getDisplayName: () => badge,
              getIconType: () => ['help', 'search', undefined][id % 3],
              id: `${id}`,
              isCompatible: async () => true,
              type: '',
            })) ?? []
          );
        default:
          return [];
      }
    },
    [badges]
  );
  const ref = useRef<React.ComponentRef<typeof HelloWorldEmbeddablePanel>>(null);

  useEffect(
    () =>
      void ref.current?.embeddable.store.dispatch(
        actions.input.setLastReloadRequestTime(new Date().getMilliseconds())
      ),
    [getActions]
  );

  return <HelloWorldEmbeddablePanel ref={ref} {...props} getActions={getActions} />;
}

DefaultWithBadges.args = {
  ...Default.args,
  badges: ['Help', 'Search', 'Something'],
};

DefaultWithBadges.argTypes = {
  badges: { name: 'Badges' },
};

interface DefaultWithContextMenuProps extends HelloWorldEmbeddablePanelProps {
  items: string[];
}

export function DefaultWithContextMenu({ items, ...props }: DefaultWithContextMenuProps) {
  const getActions = useCallback(
    async (type: string) => {
      switch (type) {
        case CONTEXT_MENU_TRIGGER:
          return (
            items?.map<Action>((item, id) => ({
              execute: async (...args) => action(`onClick(${item})`)(...args),
              getDisplayName: () => item,
              getIconType: () => ['help', 'search', undefined][id % 3],
              id: `${id}`,
              isCompatible: async () => true,
              type: '',
            })) ?? []
          );
        default:
          return [];
      }
    },
    [items]
  );
  const ref = useRef<React.ComponentRef<typeof HelloWorldEmbeddablePanel>>(null);

  useEffect(
    () =>
      void ref.current?.embeddable.store.dispatch(
        actions.input.setLastReloadRequestTime(new Date().getMilliseconds())
      ),
    [getActions]
  );

  return <HelloWorldEmbeddablePanel ref={ref} {...props} getActions={getActions} />;
}

DefaultWithContextMenu.args = {
  ...Default.args,
  items: ['Help', 'Search', 'Something'],
};

DefaultWithContextMenu.argTypes = {
  items: { name: 'Context Menu Items' },
};

interface DefaultWithErrorProps extends HelloWorldEmbeddablePanelProps {
  message: string;
}

export function DefaultWithError({ message, ...props }: DefaultWithErrorProps) {
  const ref = useRef<React.ComponentRef<typeof HelloWorldEmbeddablePanel>>(null);

  useEffect(
    () => void ref.current?.embeddable.store.dispatch(actions.output.setError(new Error(message))),
    [message]
  );

  return <HelloWorldEmbeddablePanel ref={ref} {...props} />;
}

DefaultWithError.args = {
  ...Default.args,
  message: 'Something went wrong',
};

DefaultWithError.argTypes = {
  message: { name: 'Message', control: { type: 'text' } },
};

export function DefaultWithCustomError({ message, ...props }: DefaultWithErrorProps) {
  const ref = useRef<React.ComponentRef<typeof HelloWorldEmbeddablePanel>>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.embeddable.catchError = (error) => {
        return <EuiEmptyPrompt iconColor="warning" iconType="bug" body={error.message} />;
      };
    }
  }, []);
  useEffect(
    () => void ref.current?.embeddable.store.dispatch(actions.output.setError(new Error(message))),
    [message]
  );

  return <HelloWorldEmbeddablePanel ref={ref} {...props} />;
}

DefaultWithCustomError.args = {
  ...Default.args,
  message: 'Something went wrong',
};

DefaultWithCustomError.argTypes = {
  message: { name: 'Message', control: { type: 'text' } },
};
