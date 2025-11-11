/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiIconTip,
  EuiToolTip,
  EuiThemeProvider,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Project } from './project_picker';
import { strings } from './project_picker';

interface ProjectListItemProps {
  project: Project;
  index: number;
  originProjectId: string;
}

const SOLUTION_ICONS: Record<string, string> = {
  elasticsearch: 'logoElasticsearch',
  es: 'logoElasticsearch',
  security: 'logoSecurity',
  observability: 'logoObservability',
} as const;

const getSolutionIcon = (solution: string): string => {
  return SOLUTION_ICONS[solution] || 'empty';
};

const CSP_LABELS: Record<string, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
} as const;

const getCSPLabel = (csp: string): string => {
  return CSP_LABELS[csp] || csp.toUpperCase();
};

export const ProjectListItem = ({ project, index, originProjectId }: ProjectListItemProps) => {
  const { euiTheme } = useEuiTheme();

  const tags = Object.entries(project)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) => `${key}: ${value}`);

  return (
    <EuiFlexItem
      key={project._id}
      css={{
        borderTop:
          index > 0
            ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`
            : undefined,
        padding: `${euiTheme.size.s}`,
      }}
    >
      <EuiFlexGroup responsive={false} alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={getSolutionIcon(project._type)} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="text">
                {project._alias || project._id}
              </EuiText>
            </EuiFlexItem>
            {project._id === originProjectId ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip size="m" type="flag" content={strings.getOriginProjectLabel()} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {`${getCSPLabel(project._csp)}, ${project._region}`}
              </EuiText>
            </EuiFlexItem>
            {tags.length ? (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  title={i18n.translate('unifiedSearch.projectPicker.tagTooltipTitle', {
                    defaultMessage: 'Custom tags',
                  })}
                  content={tags.map((tag) => (
                    <EuiThemeProvider colorMode="dark">
                      <EuiBadge css={{ margin: `${euiTheme.size.xs}` }}>{tag}</EuiBadge>
                    </EuiThemeProvider>
                  ))}
                >
                  <EuiBadge iconType="tag">{tags.length}</EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
