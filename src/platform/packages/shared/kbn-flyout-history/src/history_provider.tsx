/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode, useEffect, useState } from 'react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { FlyoutHistoryContext, type HistoryItem } from './history_context';

interface Props {
  historyKey: symbol;
  children: ReactNode;
}

const computeHistoryItems = (historyKey: symbol): HistoryItem[] => {
  const store = getFlyoutManagerStore();
  const { sessions } = store.getState();

  const currentSessionIndex = sessions.length - 1;
  const currentSession = currentSessionIndex >= 0 ? sessions[currentSessionIndex] : null;
  if (!currentSession || currentSession.historyKey !== historyKey) return [];

  const previousSessionsInGroup = sessions
    .slice(0, currentSessionIndex)
    .filter((s) => s.historyKey === historyKey);

  const childItems: HistoryItem[] = [...(currentSession.childHistory ?? [])]
    .reverse()
    .map((entry) => ({
      title: entry.title,
      iconType: entry.iconType,
      onClick: () => store.goToFlyout(entry.flyoutId, 'child'),
    }));

  const previousSessionItems: HistoryItem[] = [];
  for (const session of previousSessionsInGroup) {
    const { mainFlyoutId } = session;
    const history = session.childHistory ?? [];
    const hasChildren =
      (session.childFlyoutId != null && session.childTitle != null) || history.length > 0;

    if (session.childFlyoutId && session.childTitle) {
      previousSessionItems.push({
        title: session.childTitle,
        iconType: session.childIconType,
        onClick: () => store.goToFlyout(mainFlyoutId, 'main'),
      });
    }

    for (let h = history.length - 1; h >= 0; h--) {
      const entry = history[h];
      previousSessionItems.push({
        title: entry.title,
        iconType: entry.iconType,
        onClick: () => {
          store.goToFlyout(mainFlyoutId, 'main');
          store.goToFlyout(entry.flyoutId, 'child');
        },
      });
    }

    if (!hasChildren) {
      previousSessionItems.push({
        title: session.title,
        iconType: session.iconType,
        onClick: () => store.goToFlyout(mainFlyoutId, 'main'),
      });
    }
  }

  return [...childItems, ...previousSessionItems];
};

export const FlyoutHistoryProvider = ({ historyKey, children }: Props): React.JSX.Element => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() =>
    computeHistoryItems(historyKey)
  );

  useEffect(() => {
    setHistoryItems(computeHistoryItems(historyKey));
    return getFlyoutManagerStore().subscribe(() => {
      setHistoryItems(computeHistoryItems(historyKey));
    });
  }, [historyKey]);

  // TODO: wrap with EuiFlyoutPluginContext.Provider once EUI reads historyKey and MenuBarSlot from context.
  // import { EuiFlyoutPluginContext } from '@elastic/eui';
  // import { HistoryMenuBar } from './history_menu_bar';
  // <EuiFlyoutPluginContext.Provider value={{ historyKey, MenuBarSlot: HistoryMenuBar }}>
  //   <FlyoutHistoryContext.Provider value={{ historyKey, historyItems }}>
  //     {children}
  //   </FlyoutHistoryContext.Provider>
  // </EuiFlyoutPluginContext.Provider>
  return (
    <FlyoutHistoryContext.Provider value={{ historyKey, historyItems }}>
      {children}
    </FlyoutHistoryContext.Provider>
  );
};
