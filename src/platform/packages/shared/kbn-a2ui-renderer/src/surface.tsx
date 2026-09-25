/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useSyncExternalStore } from 'react';
import type { Surface } from './message_processor';
import { bindingPathOf, resolveDynamic, resolvePath, resolveProps } from './resolve_dynamic';
import type { ResolveScope } from './resolve_dynamic';
import { ROOT_COMPONENT_ID } from './types';
import type {
  Action,
  Catalog,
  ChildList,
  ComponentDefinition,
  JsonValue,
  ResolvedActionEvent,
} from './types';

export interface A2uiSurfaceProps {
  surface: Surface;
  catalog: Catalog;
  /** Called when a component dispatches an `action.event`. */
  onAction?: (event: ResolvedActionEvent) => void;
  /** Rendered in place of a component the catalog does not define. */
  renderUnknown?: (componentType: string, id: string) => React.ReactNode;
}

function isChildListTemplate(value: unknown): value is { componentId: string; path: string } {
  return typeof value === 'object' && value !== null && 'componentId' in value && 'path' in value;
}

export function A2uiSurface({ surface, catalog, onAction, renderUnknown }: A2uiSurfaceProps) {
  // Any write to the data model produces a new root, re-rendering the surface.
  useSyncExternalStore(surface.dataModel.subscribe, surface.dataModel.getSnapshot);

  const dispatchAction = useCallback(
    (action: Action | undefined, scope: ResolveScope) => {
      if (!action || !('event' in action)) return;
      const { name, userMessage, context } = action.event;
      const resolvedContext: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(context ?? {})) {
        const resolved = resolveDynamic(value, scope);
        if (resolved !== undefined) resolvedContext[key] = resolved;
      }
      const resolvedMessage =
        userMessage === undefined ? undefined : resolveDynamic(userMessage, scope);
      onAction?.({
        surfaceId: surface.id,
        name,
        userMessage: typeof resolvedMessage === 'string' ? resolvedMessage : undefined,
        context: resolvedContext,
      });
    },
    [onAction, surface.id]
  );

  const renderComponent = useCallback(
    (id: string, scope: ResolveScope, key?: string): React.ReactNode => {
      const definition: ComponentDefinition | undefined = surface.components.get(id);
      // Progressive rendering: a reference may arrive before its definition.
      if (!definition) return null;

      const entry = catalog.components[definition.component];
      if (!entry) {
        return (
          <React.Fragment key={key ?? id}>
            {renderUnknown?.(definition.component, id) ?? null}
          </React.Fragment>
        );
      }

      const props = resolveProps(definition, scope);

      const accessibility = definition.accessibility
        ? {
            label: asString(resolveDynamic(definition.accessibility.label ?? null, scope)),
            description: asString(
              resolveDynamic(definition.accessibility.description ?? null, scope)
            ),
            live: definition.accessibility.live,
            hidden: resolveDynamic(definition.accessibility.hidden ?? null, scope) === true,
          }
        : undefined;

      const buildChild = (child: string | ChildList | undefined): React.ReactNode => {
        if (child === undefined || child === null) return null;

        if (typeof child === 'string') return renderComponent(child, scope);

        if (Array.isArray(child)) {
          return child.map((childId, i) => renderComponent(childId, scope, `${childId}:${i}`));
        }

        if (isChildListTemplate(child)) {
          const listPath = resolvePath(child.path, scope.basePath);
          const items = surface.dataModel.get(listPath);
          if (!Array.isArray(items)) return null;
          return items.map((_item, i) =>
            renderComponent(
              child.componentId,
              { ...scope, basePath: `${listPath}/${i}`, index: i },
              `${child.componentId}:${i}`
            )
          );
        }

        return null;
      };

      const Render = entry.render;
      return (
        <Render
          key={key ?? id}
          id={id}
          props={props}
          rawProps={definition as Record<string, unknown>}
          accessibility={accessibility}
          buildChild={buildChild}
          setValue={(path, value) => surface.dataModel.set(path, value)}
          getBindingPath={(propName) => bindingPathOf(definition[propName], scope)}
          dispatchAction={(action) => dispatchAction(action, scope)}
        />
      );
    },
    [surface, catalog, dispatchAction, renderUnknown]
  );

  const scope: ResolveScope = {
    dataModel: surface.dataModel,
    functions: catalog.functions ?? {},
  };

  return <>{renderComponent(ROOT_COMPONENT_ID, scope)}</>;
}

function asString(value: JsonValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
