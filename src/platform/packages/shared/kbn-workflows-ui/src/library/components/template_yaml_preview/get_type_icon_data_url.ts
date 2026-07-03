/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import {
  getBaseConnectorType,
  getConnectorSpecIcon,
  HardcodedIcons,
} from '../../../components/step_icons';

type ActionTypeRegistry = TriggersAndActionsUIPublicPluginStart['actionTypeRegistry'];

/**
 * Render a React component (e.g. an SVG) to a data URL usable as a CSS
 * `background-image`. Returns `fallbackUrl` on error or unsupported output.
 */
function getDataUrlFromReactComponent(
  component: React.ComponentType<{ width: number; height: number }>,
  fallbackUrl: string
): string {
  try {
    const element = React.createElement(component, { width: 16, height: 16 });
    let htmlString = renderToStaticMarkup(element);
    if (htmlString.includes('<img')) {
      const srcMatch = htmlString.match(/src="([^"]+)"/);
      if (srcMatch?.[1]?.startsWith('data:')) {
        return srcMatch[1];
      }
      return fallbackUrl;
    }
    if (/fill="none"/i.test(htmlString)) {
      htmlString = htmlString
        .replaceAll(/fill="none"/gi, '')
        .replace(/<svg([^>]*?)>/, '<svg$1 fill="currentColor">');
    }
    return `data:image/svg+xml;base64,${btoa(htmlString)}`;
  } catch {
    return fallbackUrl;
  }
}

type ImageComponent = React.ComponentType<{ width: number; height: number }>;

interface LazyImageComponent extends React.LazyExoticComponent<ImageComponent> {
  _payload: {
    _result:
      | (() => Promise<{ default: ImageComponent }>)
      | Promise<{ default: ImageComponent }>
      | { default: ImageComponent };
  };
}

function isLazyExoticComponent(component: unknown): component is LazyImageComponent {
  const comp = component as LazyImageComponent | undefined;
  return comp?.$$typeof === Symbol.for('react.lazy') && comp?._payload?._result !== undefined;
}

async function resolveLazyComponent(lazyComponent: LazyImageComponent): Promise<ImageComponent> {
  const result = lazyComponent._payload._result;
  const module = typeof result === 'function' ? await result() : await result;
  return module.default;
}

/**
 * Resolve an `IconType` (data URL string, lazy component, or function component)
 * to a data URL. Returns `fallbackUrl` when the icon is undefined or is a plain
 * EUI glyph name (which cannot be used directly as a `background-image`).
 */
async function resolveIconToDataUrl(
  icon: IconType | undefined,
  fallbackUrl: string
): Promise<string> {
  if (!icon) {
    return fallbackUrl;
  }
  if (typeof icon === 'string') {
    return icon.startsWith('data:') ? icon : fallbackUrl;
  }
  if (isLazyExoticComponent(icon)) {
    const Component = await resolveLazyComponent(icon);
    return getDataUrlFromReactComponent(Component, fallbackUrl);
  }
  if (typeof icon === 'function') {
    return getDataUrlFromReactComponent(icon as ImageComponent, fallbackUrl);
  }
  return fallbackUrl;
}

function findStepDefinitionIconByBaseType(
  stepType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): IconType | undefined {
  const prefix = `${getBaseConnectorType(stepType)}.`;
  const family = workflowsExtensions
    .getAllStepDefinitions()
    .filter((def) => def.id.startsWith(prefix));
  return (family.find((def) => def.icon) ?? family[0])?.icon;
}

export interface GetTypeIconDataUrlParams {
  type: string;
  kind: 'step' | 'trigger';
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  actionTypeRegistry: ActionTypeRegistry;
}

/**
 * Resolve a workflow step or trigger `type` to a data URL for the inline icon
 * rendered next to the `type:` value in the read-only preview. Resolution
 * mirrors the workflow editor: dynamically-registered icons (workflows
 * extensions + connector action-type registry) take precedence over the static
 * connector-spec and hardcoded fallbacks.
 */
export async function getTypeIconDataUrl({
  type,
  kind,
  workflowsExtensions,
  actionTypeRegistry,
}: GetTypeIconDataUrlParams): Promise<string> {
  if (kind === 'trigger') {
    const hardcoded = HardcodedIcons[type];
    if (hardcoded) {
      return hardcoded;
    }
    const extensionIcon = workflowsExtensions.getTriggerDefinition(type)?.icon;
    return resolveIconToDataUrl(extensionIcon, HardcodedIcons.trigger);
  }

  const baseType = getBaseConnectorType(type);

  const extensionIcon =
    workflowsExtensions.getStepDefinition(type)?.icon ??
    findStepDefinitionIconByBaseType(type, workflowsExtensions);
  if (extensionIcon) {
    const resolved = await resolveIconToDataUrl(extensionIcon, '');
    if (resolved) {
      return resolved;
    }
  }

  const hardcoded =
    HardcodedIcons[type] ?? HardcodedIcons[baseType] ?? HardcodedIcons[`.${baseType}`];
  if (hardcoded) {
    return hardcoded;
  }

  const connectorSpecIcon = getConnectorSpecIcon(type);
  if (connectorSpecIcon) {
    const resolved = await resolveIconToDataUrl(connectorSpecIcon, '');
    if (resolved) {
      return resolved;
    }
  }

  const actionTypeId = `.${baseType}`;
  if (actionTypeRegistry.has(actionTypeId)) {
    const resolved = await resolveIconToDataUrl(
      actionTypeRegistry.get(actionTypeId).iconClass as IconType,
      ''
    );
    if (resolved) {
      return resolved;
    }
  }

  return HardcodedIcons.default;
}
