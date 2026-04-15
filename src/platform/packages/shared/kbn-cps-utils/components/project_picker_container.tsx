/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ProjectRouting } from '@kbn/es-query';
import type { ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';
import { DisabledProjectPicker, ProjectPicker } from './project_picker';
import { useFetchProjects } from './use_fetch_projects';
import { ProjectPickerSettings } from './project_picker_settings';

interface ProjectPickerContainerProps {
  cpsManager: ICPSManager;
}

/**
 * Container component that connects ProjectPicker to CPSManager.
 * Delegates to ActiveProjectPicker or DisabledProjectPicker based on access level,
 * so the fetch hook only runs when the picker is actually active.
 */
export const ProjectPickerContainer: React.FC<ProjectPickerContainerProps> = ({ cpsManager }) => {
  const access = useObservable(cpsManager.getProjectPickerAccess$(), ProjectRoutingAccess.DISABLED);

  if (access === ProjectRoutingAccess.DISABLED) {
    return <DisabledProjectPicker totalProjectCount={cpsManager.getTotalProjectCount()} />;
  }

  return (
    <ActiveProjectPicker
      cpsManager={cpsManager}
      isReadonly={access === ProjectRoutingAccess.READONLY}
    />
  );
};

interface ActiveProjectPickerProps {
  cpsManager: ICPSManager;
  isReadonly: boolean;
}

const ActiveProjectPicker: React.FC<ActiveProjectPickerProps> = ({ cpsManager, isReadonly }) => {
  const { projectRouting, updateProjectRouting } = useProjectRouting(cpsManager);

  const fetchProjects = useCallback(
    (routing?: ProjectRouting) => {
      return cpsManager.fetchProjects(routing);
    },
    [cpsManager]
  );

  const projects = useFetchProjects(fetchProjects, projectRouting);

  const resetProjectPicker = useCallback(() => {
    updateProjectRouting(cpsManager.getDefaultProjectRouting());
  }, [cpsManager, updateProjectRouting]);

  return (
    <ProjectPicker
      projectRouting={projectRouting}
      onProjectRoutingChange={updateProjectRouting}
      projects={projects}
      totalProjectCount={cpsManager.getTotalProjectCount()}
      isReadonly={isReadonly}
      settingsComponent={<ProjectPickerSettings onResetToDefaults={resetProjectPicker} />}
    />
  );
};

/**
 * Hook for interacting with project routing observable.
 * Subscribes to routing changes and provides setter function.
 */
const useProjectRouting = (cpsManager: ICPSManager) => {
  const [projectRouting, setProjectRouting] = useState<ProjectRouting | undefined>(
    cpsManager.getProjectRouting()
  );

  useEffect(() => {
    const subscription = cpsManager.getProjectRouting$().subscribe((newRouting) => {
      setProjectRouting(newRouting);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cpsManager]);

  const updateProjectRouting = useCallback(
    (newRouting: ProjectRouting) => {
      cpsManager.setProjectRouting(newRouting);
    },
    [cpsManager]
  );

  return { projectRouting, updateProjectRouting };
};
