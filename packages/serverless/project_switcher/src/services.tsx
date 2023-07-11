/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useContext } from 'react';
import ReactDOM from 'react-dom';
import { Loader } from './loader';

import type { Services, KibanaDependencies } from './types';

const Context = React.createContext<Services | null>(null);

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const ProjectSwitcherProvider: FC<Services> = ({ children, ...services }) => {
  return <Context.Provider value={services}>{children}</Context.Provider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const ProjectSwitcherKibanaProvider: FC<KibanaDependencies> = ({
  children,
  coreStart,
  projectChangeAPIUrl,
}) => {
  const value: Services = {
    setProjectType: (projectType) => {
      coreStart.http
        .post(projectChangeAPIUrl, { body: JSON.stringify({ id: projectType }) })
        .then(() => {
          ReactDOM.render(<Loader project={projectType} />, document.body);

          // Give the watcher a couple of seconds to see the file change.
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        });
    },
  };

  return <Context.Provider {...{ value }}>{children}</Context.Provider>;
};

/**
 * React hook for accessing pre-wired services.
 */
export function useServices() {
  const context = useContext(Context);

  if (!context) {
    throw new Error(
      'ProjectSwitcher Context is missing.  Ensure your component or React root is wrapped with ProjectSwitcherContext.'
    );
  }

  return context;
}
