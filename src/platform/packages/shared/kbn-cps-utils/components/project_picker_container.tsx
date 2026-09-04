/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ProjectRouting } from '@kbn/es-query';
import type { ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';
import { ProjectPicker } from './project_picker';
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

  return (
    <ActiveProjectPicker
      cpsManager={cpsManager}
      isReadonly={access === ProjectRoutingAccess.READONLY}
      isDisabled={access === ProjectRoutingAccess.DISABLED}
    />
  );
};

interface ActiveProjectPickerProps {
  cpsManager: ICPSManager;
  isReadonly: boolean;
  isDisabled: boolean;
}

const ActiveProjectPicker: React.FC<ActiveProjectPickerProps> = ({
  cpsManager,
  isReadonly,
  isDisabled,
}) => {
  const fetchProjectsByRouting = useCallback(
    (projectRouting?: ProjectRouting) => cpsManager.fetchProjects(projectRouting),
    [cpsManager]
  );

  const defaultProjectRoutingGetter = useCallback(() => {
    return cpsManager.getDefaultProjectRouting();
  }, [cpsManager]);

  const currentProjectRoutingGetter = useCallback(() => {
    return cpsManager.getProjectRouting();
  }, [cpsManager]);

  const updateProjectRouting = useCallback(
    (newRouting: ProjectRouting) => {
      cpsManager.setProjectRouting(newRouting);
    },
    [cpsManager]
  );

  const customHeaderContextMenuItems = useMemo(
    () => Object.values(cpsManager.getConfigurationLinks()),
    [cpsManager]
  );

  return (
    <ProjectPicker
      totalProjectCount={cpsManager.getTotalProjectCount()}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      onProjectRoutingChange={updateProjectRouting}
      fetchProjectsByRouting={fetchProjectsByRouting}
      isReadonly={isReadonly}
      isDisabled={isDisabled}
      customHeaderContextMenuItems={customHeaderContextMenuItems}
    />
  );
};
