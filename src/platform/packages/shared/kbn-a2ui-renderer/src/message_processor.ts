/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataModel } from './data_model';
import { UnknownMessageError } from './errors';
import type { A2uiMessage, ComponentDefinition, JsonValue } from './types';

export interface Surface {
  id: string;
  catalogId?: string;
  sendDataModel: boolean;
  components: Map<string, ComponentDefinition>;
  dataModel: DataModel;
}

/**
 * Applies A2UI messages to a set of surfaces. Only the four document-shaped
 * message types are handled; the agent round-trip messages
 * (`callRendererFunction` / `agentFunctionResponse`) are out of scope.
 */
export class MessageProcessor {
  private readonly surfaces = new Map<string, Surface>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  getSurface = (surfaceId: string): Surface | undefined => this.surfaces.get(surfaceId);

  getSurfaceIds = (): string[] => [...this.surfaces.keys()];

  /** Bumped whenever a surface is added, removed, or has its components changed. */
  getSnapshot = (): number => this.version;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  applyAll = (messages: A2uiMessage[]): void => {
    messages.forEach((message) => this.apply(message, { silent: true }));
    this.notify();
  };

  apply = (message: A2uiMessage, { silent = false }: { silent?: boolean } = {}): void => {
    if ('createSurface' in message) {
      const { surfaceId, catalogId, sendDataModel, components, dataModel } = message.createSurface;
      this.surfaces.set(surfaceId, {
        id: surfaceId,
        catalogId,
        sendDataModel: sendDataModel ?? false,
        components: new Map((components ?? []).map((c) => [c.id, c])),
        dataModel: new DataModel((dataModel ?? {}) as JsonValue),
      });
    } else if ('updateComponents' in message) {
      const { surfaceId, components } = message.updateComponents;
      const surface = this.requireSurface(surfaceId);
      components.forEach((component) => surface.components.set(component.id, component));
    } else if ('updateDataModel' in message) {
      const { surfaceId, path, value } = message.updateDataModel;
      this.requireSurface(surfaceId).dataModel.set(path ?? '', value);
      // The data model notifies its own subscribers; no structural change here.
      return;
    } else if ('deleteSurface' in message) {
      this.surfaces.delete(message.deleteSurface.surfaceId);
    } else {
      throw new UnknownMessageError(message);
    }

    if (!silent) this.notify();
  };

  private requireSurface(surfaceId: string): Surface {
    const surface = this.surfaces.get(surfaceId);
    if (!surface) throw new Error(`Unknown surface "${surfaceId}"`);
    return surface;
  }

  private notify() {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}
