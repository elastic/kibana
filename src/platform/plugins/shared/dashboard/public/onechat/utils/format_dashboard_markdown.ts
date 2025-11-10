/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardMetadata } from './extract_dashboard_state';
import type { PanelInfo } from './extract_panel_info';
import type { Filter } from '@kbn/es-query';

/**
 * Formats a filter for display in markdown
 */
function formatFilter(filter: Filter): string {
  const parts: string[] = [];
  
  if (filter.meta?.key) {
    parts.push(`**${filter.meta.key}**`);
  }
  
  if (filter.meta?.value) {
    parts.push(String(filter.meta.value));
  }
  
  if (filter.meta?.negate) {
    parts.push('(negated)');
  }
  
  if (filter.meta?.disabled) {
    parts.push('(disabled)');
  }
  
  return parts.join(' ');
}

/**
 * Formats dashboard configuration as markdown
 */
export function formatDashboardMarkdown(
  metadata: DashboardMetadata,
  panels: PanelInfo[]
): string {
  const lines: string[] = [];
  
  // Dashboard header
  lines.push('# Dashboard Configuration');
  lines.push('');
  
  // Basic info
  lines.push('## Dashboard Information');
  lines.push('');
  lines.push(`**Title:** ${metadata.name || 'Untitled Dashboard'}`);
  if (metadata.id) {
    lines.push(`**ID:** ${metadata.id}`);
  }
  if (metadata.description) {
    lines.push(`**Description:** ${metadata.description}`);
  }
  lines.push(`**Mode:** ${metadata.mode}`);
  lines.push('');
  
  // Time range
  lines.push('## Time Range');
  lines.push('');
  if (metadata.timerange) {
    lines.push(`- **From:** ${metadata.timerange.from}`);
    lines.push(`- **To:** ${metadata.timerange.to}`);
  } else {
    lines.push('No time range set');
  }
  lines.push('');
  
  // Filters
  lines.push('## Filters');
  lines.push('');
  if (metadata.filters.length > 0) {
    metadata.filters.forEach((filter, index) => {
      lines.push(`${index + 1}. ${formatFilter(filter)}`);
    });
  } else {
    lines.push('No filters applied');
  }
  lines.push('');
  
  // Panels
  lines.push('## Panels');
  lines.push('');
  if (panels.length > 0) {
    panels.forEach((panel, index) => {
      lines.push(`### Panel ${index + 1}: ${panel.title || panel.type || 'Untitled'}`);
      lines.push('');
      lines.push(`- **ID:** ${panel.id}`);
      lines.push(`- **Type:** ${panel.type}`);
      if (panel.description) {
        lines.push(`- **Description:** ${panel.description}`);
      }
      
      // ESQL queries for lens panels
      if (panel.esqlQueries && panel.esqlQueries.length > 0) {
        lines.push('- **ESQL Queries:**');
        panel.esqlQueries.forEach((query, queryIndex) => {
          lines.push(`  ${queryIndex + 1}. \`\`\`esql`);
          lines.push(`  ${query}`);
          lines.push(`  \`\`\``);
        });
      }
      
      lines.push('');
    });
  } else {
    lines.push('No panels in dashboard');
  }
  
  return lines.join('\n');
}

