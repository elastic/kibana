/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

/** @public */
export type TutorialVariables = Partial<Record<string, unknown>>;

/** @public */
export type TutorialDirectoryNoticeComponent = React.FC;

/** @public */
export type TutorialDirectoryHeaderLinkComponent = React.FC;

/** @public */
export type TutorialModuleNoticeComponent = React.FC<{
  moduleName: string;
}>;

export class TutorialService {
  private tutorialVariables: TutorialVariables = {};
  private tutorialDirectoryNotices: { [key: string]: TutorialDirectoryNoticeComponent } = {};
  private tutorialDirectoryHeaderLinks: {
    [key: string]: TutorialDirectoryHeaderLinkComponent;
  } = {};
  private tutorialModuleNotices: { [key: string]: TutorialModuleNoticeComponent } = {};

  public setup() {
    return {
      /**
       * Set a variable usable in tutorial templates. Access with `{config.<key>}`.
       */
      setVariable: (key: string, value: unknown) => {
        if (this.tutorialVariables[key]) {
          throw new Error('variable already set');
        }
        this.tutorialVariables[key] = value;
      },

      /**
       * Registers a component that will be rendered at the top of tutorial directory page.
       */
      registerDirectoryNotice: (id: string, component: TutorialDirectoryNoticeComponent) => {
        if (this.tutorialDirectoryNotices[id]) {
          throw new Error(`directory notice ${id} already set`);
        }
        this.tutorialDirectoryNotices[id] = component;
      },

      /**
       * Registers a component that will be rendered next to tutorial directory title/header area.
       */
      registerDirectoryHeaderLink: (
        id: string,
        component: TutorialDirectoryHeaderLinkComponent
      ) => {
        if (this.tutorialDirectoryHeaderLinks[id]) {
          throw new Error(`directory header link ${id} already set`);
        }
        this.tutorialDirectoryHeaderLinks[id] = component;
      },

      /**
       * Registers a component that will be rendered in the description of a tutorial that is associated with a module.
       */
      registerModuleNotice: (id: string, component: TutorialModuleNoticeComponent) => {
        if (this.tutorialModuleNotices[id]) {
          throw new Error(`module notice ${id} already set`);
        }
        this.tutorialModuleNotices[id] = component;
      },
    };
  }

  public getVariables() {
    return this.tutorialVariables;
  }

  public getDirectoryNotices() {
    return Object.values(this.tutorialDirectoryNotices);
  }

  public getDirectoryHeaderLinks() {
    return Object.values(this.tutorialDirectoryHeaderLinks);
  }

  public getModuleNotices() {
    return Object.values(this.tutorialModuleNotices);
  }
}

export type TutorialServiceSetup = ReturnType<TutorialService['setup']>;
