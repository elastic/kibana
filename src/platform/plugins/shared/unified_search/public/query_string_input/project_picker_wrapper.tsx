/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @jsx jsx */
import { jsx } from '@emotion/react';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPicker } from '@kbn/cps-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUnifiedSearchPluginServices } from '../types';

interface ProjectPickerWrapperProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
}

export const ProjectPickerWrapper: React.FC<ProjectPickerWrapperProps> = ({
  projectRouting,
  onProjectRoutingChange,
}) => {
  const { cps } = useKibana<IUnifiedSearchPluginServices>().services;
  console.log('CPS in ProjectPickerWrapper', cps);

  // I want to move subscription logic here and then pass it down to ProjectPicker as a prop -
  // the cpsManager should return an readonly observable - publishingSubject 
  // that we can subscribe to get project updates

  // const [projectsData, setProjectsData] = React.useState(cps.cpsManager);

  if (!cps?.cpsManager) return null;
  if (!onProjectRoutingChange) return null;

  return (
    <EuiFlexItem grow={false}>
      <ProjectPicker
        projectRouting={projectRouting}
        onProjectRoutingChange={onProjectRoutingChange}
      />
    </EuiFlexItem>
  );
};
