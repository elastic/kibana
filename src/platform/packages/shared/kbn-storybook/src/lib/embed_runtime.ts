/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import { EMBEDDABLE_RESIZE_EVENT } from './embeddable';
import type { EmbeddableResizePayload, EmbeddableStoryParameters } from './embeddable';

/**
 * Browser runtime backing the per-alias inline registry bundle. The generated
 * `registry_entry.js` supplies the dynamic story-import map and calls
 * {@link createDocsRegistry}; all embed logic lives here so it stays typed,
 * linted, and unit-tested rather than hand-written into a string.
 */

type StoryModuleLoader = () => Promise<Record<string, unknown>>;
type StoryModules = Record<string, StoryModuleLoader>;

// A composed story is renderable as a component and carries Storybook metadata.
type ComposedStory = React.ComponentType & {
  id: string;
  parameters?: { embeddable?: EmbeddableStoryParameters };
};

export interface MountStoryOptions {
  onResize?: (size: { height: number }) => void;
}

export interface DocsRegistry {
  mountStory: (
    storybookId: string,
    container: HTMLElement,
    options?: MountStoryOptions
  ) => Promise<void>;
  unmountStory: (container: HTMLElement) => void;
  getStoryParameters: (storybookId: string) => Promise<EmbeddableStoryParameters>;
}

export interface CreateDocsRegistryOptions {
  alias: string;
  storyModules: StoryModules;
  projectAnnotations: Parameters<typeof setProjectAnnotations>[0];
}

declare global {
  interface Window {
    __kbnStorybookDocsRegistries__?: Record<string, DocsRegistry>;
  }
}

const getEmbeddableParameters = (story: ComposedStory): EmbeddableStoryParameters =>
  story.parameters?.embeddable ?? {};

export const createDocsRegistry = ({
  alias,
  storyModules,
  projectAnnotations,
}: CreateDocsRegistryOptions): DocsRegistry => {
  const roots = new WeakMap<HTMLElement, ReturnType<typeof createRoot>>();
  const observers = new WeakMap<HTMLElement, ResizeObserver>();
  const annotations = setProjectAnnotations(projectAnnotations);

  const getComposedStory = async (storybookId: string): Promise<ComposedStory> => {
    const loadStoryModule = storyModules[storybookId];

    if (!loadStoryModule) {
      throw new Error(`Unknown Storybook docs story [${storybookId}]`);
    }

    const storyModule = await loadStoryModule();
    const stories = composeStories(
      storyModule as Parameters<typeof composeStories>[0],
      annotations as Parameters<typeof composeStories>[1]
    );
    const Story = Object.values(stories).find(
      (story) => (story as ComposedStory).id === storybookId
    );

    if (!Story) {
      throw new Error(`Storybook module did not compose story [${storybookId}]`);
    }

    return Story as unknown as ComposedStory;
  };

  const reportSize = (
    container: HTMLElement,
    storyId: string,
    onResize: MountStoryOptions['onResize']
  ): void => {
    const height = Math.ceil(container.getBoundingClientRect().height);

    onResize?.({ height });

    container.dispatchEvent(
      new CustomEvent<EmbeddableResizePayload>(EMBEDDABLE_RESIZE_EVENT, {
        detail: { storyId, height },
        bubbles: true,
      })
    );
  };

  const observeSize = (
    container: HTMLElement,
    storyId: string,
    onResize: MountStoryOptions['onResize']
  ): void => {
    if (typeof ResizeObserver === 'undefined') {
      reportSize(container, storyId, onResize);
      return;
    }

    const observer = new ResizeObserver(() => reportSize(container, storyId, onResize));
    observer.observe(container);
    observers.set(container, observer);
  };

  const unmountStory = (container: HTMLElement): void => {
    observers.get(container)?.disconnect();
    observers.delete(container);

    const root = roots.get(container);

    if (!root) {
      return;
    }

    root.unmount();
    roots.delete(container);
  };

  const mountStory = async (
    storybookId: string,
    container: HTMLElement,
    options: MountStoryOptions = {}
  ): Promise<void> => {
    const Story = await getComposedStory(storybookId);

    unmountStory(container);

    const { height } = getEmbeddableParameters(Story);

    if (typeof height === 'number') {
      container.style.minHeight = `${height}px`;
    }

    const root = createRoot(container);
    roots.set(container, root);
    root.render(React.createElement(Story as React.ComponentType));
    observeSize(container, storybookId, options.onResize);
  };

  const getStoryParameters = async (storybookId: string): Promise<EmbeddableStoryParameters> =>
    getEmbeddableParameters(await getComposedStory(storybookId));

  const registry: DocsRegistry = { mountStory, unmountStory, getStoryParameters };

  if (typeof window !== 'undefined') {
    window.__kbnStorybookDocsRegistries__ = window.__kbnStorybookDocsRegistries__ ?? {};
    window.__kbnStorybookDocsRegistries__[alias] = registry;
  }

  return registry;
};
