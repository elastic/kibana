/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useObservable from 'react-use/lib/useObservable';
import { EuiFlyout, EuiSkeletonText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AppHeaderMenu } from '@kbn/app-header';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { compressToEncodedURIComponent } from 'lz-string';
import { i18n } from '@kbn/i18n';
import type { Subscription } from 'rxjs';
import type { HousekeepingFinding, HousekeepingResource, HousekeepingScope } from '../common';
import { HOUSEKEEPING_APP_ID, HOUSEKEEPING_RESOURCE_API_PATH } from '../common';
import { FindingsStore, toKey } from './findings_store';
import {
  AskAgentContext,
  ContentListCoreContext,
  FindingActionsContext,
  HOUSEKEEPING_FLYOUT_TITLE_ID,
  OpenInConsoleContext,
  ResourceLinksContext,
} from './metadata';
import type { AskAgentRequest, HousekeepingFindingActionDefinition } from './metadata';
import { buildAskAgentPrompt } from './ask_agent_prompt';
import { resolveAgentBuilder } from './agent_builder';
import { HOUSEKEEPING_TITLE } from './texts';
import type { ConsoleActions, ResourceLink } from './metadata';

const CONSOLE_APP_LOCATOR_ID = 'CONSOLE_APP_LOCATOR';
const FLYOUT_WIDTH = 600;
/**
 * Large definitions are cut, so a huge template doesn't fill the context of the model. The cut
 * can leave the JSON incomplete on purpose: the model reads it as text.
 */
const MAX_DEFINITION_LENGTH = 20_000;

/** The app, or the section and app of Stack Management, such as `management/data/snapshot_restore`. */
const getPluginOf = (location: string) => {
  const [, , app, ...rest] = location.split(/[?#]/)[0].split('/');
  return app === 'management' ? [app, ...rest.slice(0, 2)].join('/') : app;
};
const FULL_REPORT_PATH = `/stack/${HOUSEKEEPING_APP_ID}`;

const loadComponents = () => import('./components');
const HousekeepingFlyoutContent = lazy(async () => ({
  default: (await loadComponents()).HousekeepingFlyoutContent,
}));
const FindingsPanel = lazy(async () => ({ default: (await loadComponents()).FindingsPanel }));

export type HousekeepingAppMenuItem = NonNullable<AppHeaderMenu['items']>[number];

export interface HousekeepingPublicStart {
  /** Opens a flyout with the findings of `scope`; without a scope, every finding. */
  openHousekeepingFlyout(scope?: HousekeepingScope): void;
  /** Entry for the `menu` of an `AppHeader` that opens the flyout for `scope`. */
  getAppMenuItem(scope?: HousekeepingScope): HousekeepingAppMenuItem;
  /** The findings of `scope` without a flyout, for pages that embed them. */
  HousekeepingFindings: React.FC<{ scope?: HousekeepingScope }>;
}

export const createHousekeepingService = (
  core: CoreStart,
  share?: SharePluginStart,
  consolePlugin?: ConsolePluginStart,
  agentBuilderPlugin?: AgentBuilderPluginStart,
  findingActions: ReadonlyMap<string, HousekeepingFindingActionDefinition> = new Map()
) => {
  const store = new FindingsStore(core.http);
  let closeFlyout: (() => void) | undefined;

  const getResourceLink = (
    { locator: resourceLocator }: HousekeepingResource,
    onNavigate?: () => void
  ): ResourceLink | undefined => {
    const locator = resourceLocator && share?.url.locators.get(resourceLocator.id);
    if (!locator || !resourceLocator) {
      return undefined;
    }
    return {
      href: locator.getRedirectUrl(resourceLocator.params),
      onClick: (event) => {
        event.preventDefault();
        onNavigate?.();
        locator.navigate(resourceLocator.params);
      },
    };
  };

  /** The definition of the resource and what Housekeeping found about it, for the agent. */
  const getAttachmentContent = async ({ resource, evidence }: AskAgentRequest['finding']) => {
    try {
      const { definition } = await core.http.get<{ definition?: unknown }>(
        `${HOUSEKEEPING_RESOURCE_API_PATH}/${encodeURIComponent(
          resource.type
        )}/${encodeURIComponent(resource.id)}`
      );
      return definition === undefined
        ? undefined
        : JSON.stringify({ definition, housekeeping: evidence }, null, 2).slice(
            0,
            MAX_DEFINITION_LENGTH
          );
    } catch {
      // The chat still opens, the agent can look the resource up itself.
      return undefined;
    }
  };

  const askAgent = async (chat: AgentBuilderPluginStart, request: AskAgentRequest) => {
    const { finding, resourceTypeLabel } = request;
    const definition = await getAttachmentContent(finding);
    chat.openChat({
      newConversation: true,
      initialMessage: buildAskAgentPrompt({ ...request, hasDefinition: Boolean(definition) }),
      autoSendInitialMessage: true,
      attachments: definition
        ? [
            {
              type: 'text',
              data: { content: definition },
              description: `${resourceTypeLabel} ${finding.resource.id}`,
            },
          ]
        : undefined,
    });
  };

  /** The embedded Console when the page renders it, otherwise Console in a new tab. */
  const getConsoleActions = (onNavigate?: () => void): ConsoleActions | undefined => {
    const consoleLocator = share?.url.locators.get(CONSOLE_APP_LOCATOR_ID);
    if (!core.application.capabilities.dev_tools?.show || (!consolePlugin && !consoleLocator)) {
      return undefined;
    }
    const hasEmbeddedConsole = () => consolePlugin?.isEmbeddedConsoleAvailable?.() ?? false;
    return {
      opensInNewTab: () => !hasEmbeddedConsole(),
      open: (request) => {
        if (hasEmbeddedConsole()) {
          onNavigate?.();
          consolePlugin?.openEmbeddedConsole?.(request);
          return;
        }
        if (consoleLocator) {
          window.open(
            consoleLocator.getRedirectUrl({
              loadFrom: `data:text/plain,${compressToEncodedURIComponent(request)}`,
            }),
            '_blank',
            'noreferrer'
          );
        }
      },
    };
  };

  let agentBuilder: Promise<AgentBuilderPluginStart | undefined> | undefined;
  const getAgentBuilder = () => {
    agentBuilder ??= resolveAgentBuilder(core, agentBuilderPlugin).catch(() => undefined);
    return agentBuilder;
  };

  /** Links to the owning plugins and to Agent Builder, closing the flyout first when there is one. */
  const LinksProvider = ({
    onNavigate,
    onOpenOverlay,
    children,
  }: {
    onNavigate?: () => void;
    /** Runs before the Agent Builder chat or the flyout of a finding action opens, to make room. */
    onOpenOverlay?: () => void;
    children: React.ReactNode;
  }) => {
    const [chat, setChat] = useState<AgentBuilderPluginStart>();
    useEffect(() => {
      let isMounted = true;
      getAgentBuilder().then((agentBuilderStart) => {
        if (isMounted) {
          setChat(agentBuilderStart);
        }
      });
      return () => {
        isMounted = false;
      };
    }, []);

    const resourceLinks = useMemo(
      () => (resource: HousekeepingResource) => getResourceLink(resource, onNavigate),
      [onNavigate]
    );
    const askAgentAbout = useMemo(
      () =>
        chat &&
        ((request: AskAgentRequest) => {
          onOpenOverlay?.();
          askAgent(chat, request);
        }),
      [chat, onOpenOverlay]
    );
    const consoleActions = useMemo(() => getConsoleActions(onNavigate), [onNavigate]);
    const getFindingActions = useMemo(
      () => (finding: HousekeepingFinding) =>
        (finding.actions ?? []).flatMap(({ id }) => {
          const definition = findingActions.get(id);
          return definition
            ? [
                {
                  label: definition.label,
                  iconType: definition.iconType,
                  onClick: () => {
                    onOpenOverlay?.();
                    definition.run(finding);
                  },
                },
              ]
            : [];
        }),
      [onOpenOverlay]
    );

    return (
      <ContentListCoreContext.Provider value={core}>
        <ResourceLinksContext.Provider value={resourceLinks}>
          <AskAgentContext.Provider value={askAgentAbout}>
            <OpenInConsoleContext.Provider value={consoleActions}>
              <FindingActionsContext.Provider value={getFindingActions}>
                {children}
              </FindingActionsContext.Provider>
            </OpenInConsoleContext.Provider>
          </AskAgentContext.Provider>
        </ResourceLinksContext.Provider>
      </ContentListCoreContext.Provider>
    );
  };

  const useFindings = (scope?: HousekeepingScope) => {
    const state = useObservable(store.getState$(scope), store.getState(scope));
    // By key, so a scope written inline doesn't load again on every render.
    const key = toKey(scope);
    const latestScope = useLatest(scope);
    useEffect(() => {
      store.load(latestScope.current);
    }, [key, latestScope]);
    return { state, rerun: () => store.load(scope, { force: true }) };
  };

  const ConnectedFlyout = ({
    scope,
    onClose,
  }: {
    scope?: HousekeepingScope;
    onClose: () => void;
  }) => {
    const { state, rerun } = useFindings(scope);
    // A mask would cover the Agent Builder chat or the flyout of an action, so it goes away first.
    const [hasMask, setHasMask] = useState(true);
    const removeMask = useCallback(() => setHasMask(false), []);
    return (
      <EuiFlyout
        // Fixed, so the flyout keeps its width when the chat pushes the page.
        size={FLYOUT_WIDTH}
        ownFocus={hasMask}
        outsideClickCloses={hasMask}
        onClose={onClose}
        aria-labelledby={HOUSEKEEPING_FLYOUT_TITLE_ID}
        data-test-subj="housekeepingFlyout"
      >
        <LinksProvider onNavigate={onClose} onOpenOverlay={removeMask}>
          <Suspense fallback={<EuiSkeletonText lines={4} />}>
            <HousekeepingFlyoutContent
              state={state}
              onRerun={rerun}
              onClose={onClose}
              fullReport={
                scope
                  ? {
                      href: core.application.getUrlForApp('management', {
                        path: FULL_REPORT_PATH,
                      }),
                      onClick: (event) => {
                        event.preventDefault();
                        onClose();
                        core.application.navigateToApp('management', { path: FULL_REPORT_PATH });
                      },
                    }
                  : undefined
              }
            />
          </Suspense>
        </LinksProvider>
      </EuiFlyout>
    );
  };

  /** Rendered outside `overlays.openFlyout`, which can't drop the mask of an open flyout. */
  const openHousekeepingFlyout = (scope?: HousekeepingScope) => {
    closeFlyout?.();
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Set after `close`, which they call and which cleans them up.
    const state: { unmount?: () => void; subscription?: Subscription } = {};
    const close = () => {
      state.subscription?.unsubscribe();
      state.unmount?.();
      container.remove();
      if (closeFlyout === close) {
        closeFlyout = undefined;
      }
    };
    closeFlyout = close;

    // The flyout belongs to the plugin that opened it, not to the tabs inside it.
    let openedIn: string | undefined;
    state.subscription = core.application.currentLocation$.subscribe((location) => {
      const plugin = getPluginOf(location);
      openedIn ??= plugin;
      if (plugin !== openedIn) {
        close();
      }
    });
    state.unmount = toMountPoint(
      <ConnectedFlyout scope={scope} onClose={close} />,
      core
    )(container);
  };

  const HousekeepingFindings = ({ scope }: { scope?: HousekeepingScope }) => {
    const { state, rerun } = useFindings(scope);
    return (
      <LinksProvider>
        <Suspense fallback={<EuiSkeletonText lines={4} />}>
          <FindingsPanel state={state} onRetry={rerun} />
        </Suspense>
      </LinksProvider>
    );
  };

  const start: HousekeepingPublicStart = {
    openHousekeepingFlyout,
    getAppMenuItem: (scope) => ({
      id: 'housekeeping',
      label: HOUSEKEEPING_TITLE,
      iconType: 'broom',
      testId: 'housekeepingAppMenuItem',
      run: () => openHousekeepingFlyout(scope),
      tooltipContent: () => {
        const { response } = store.getState(scope);
        return response
          ? i18n.translate('housekeeping.appMenuItem.tooltip', {
              defaultMessage:
                'Last run: {broken} broken references, {deprecations} deprecations, {unused} unused resources, {risk} risks',
              values: {
                broken: response.summary.broken_reference,
                deprecations: response.summary.deprecation,
                unused: response.summary.unused,
                risk: response.summary.risk,
              },
            })
          : undefined;
      },
    }),
    HousekeepingFindings,
  };

  return { start, useFindings, LinksProvider, EmbeddableConsole: consolePlugin?.EmbeddableConsole };
};

export type HousekeepingService = ReturnType<typeof createHousekeepingService>;
