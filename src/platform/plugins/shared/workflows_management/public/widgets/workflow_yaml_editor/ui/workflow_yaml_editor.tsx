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

import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { monaco } from '@kbn/monaco';
import { getJsonSchemaFromYamlSchema } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/v1';
import type { SchemasSettings } from 'monaco-yaml';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import YAML, { isPair, isScalar, isMap, visit } from 'yaml';
import { STACK_CONNECTOR_LOGOS } from '@kbn/stack-connectors-plugin/public';
import {
  getWorkflowZodSchema,
  getWorkflowZodSchemaLoose,
  addDynamicConnectorsToCache,
} from '../../../../common/schema';
import { useAvailableConnectors } from '../../../hooks/use_available_connectors';
import { UnsavedChangesPrompt } from '../../../shared/ui/unsaved_changes_prompt';
import { YamlEditor } from '../../../shared/ui/yaml_editor';
import { getCompletionItemProvider } from '../lib/get_completion_item_provider';
import { useYamlValidation } from '../lib/use_yaml_validation';
import { getMonacoRangeFromYamlNode, navigateToErrorPosition } from '../lib/utils';
import type { YamlValidationError } from '../model/types';
import { WorkflowYAMLValidationErrors } from './workflow_yaml_validation_errors';
import {
  registerUnifiedHoverProvider,
  createUnifiedActionsProvider,
  createStepExecutionProvider,
  registerMonacoConnectorHandler,
} from '../lib/monaco_providers';
import {
  ElasticsearchMonacoConnectorHandler,
  KibanaMonacoConnectorHandler,
} from '../lib/monaco_connectors';
import { ElasticsearchStepActions } from './elasticsearch_step_actions';

const getTriggerNodes = (
  yamlDocument: YAML.Document
): Array<{ node: any; triggerType: string; typePair: any }> => {
  const triggerNodes: Array<{ node: any; triggerType: string; typePair: any }> = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        const triggerType = pair.value.value as string;
        // Find the parent map node that contains this trigger
        const triggerMapNode = ancestors[ancestors.length - 1];
        triggerNodes.push({
          node: triggerMapNode,
          triggerType,
          typePair: pair, // Store the actual type pair for precise positioning
        });
      }
    },
  });

  return triggerNodes;
};

const getStepNodesWithType = (yamlDocument: YAML.Document): any[] => {
  const stepNodes: any[] = [];

  if (!yamlDocument?.contents) return stepNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a step (not nested inside 'with' or other blocks)
      const path = ancestors.slice();
      let isMainStepType = false;

      // Walk up the ancestors to see if we're in a steps array
      // and ensure this type field is a direct child of a step, not nested in 'with'
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];

        // If we encounter a 'with' field before finding 'steps', this is a nested type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'with') {
          return; // Skip this type field - it's inside a 'with' block
        }

        // If we find 'steps', this could be a main step type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'steps') {
          isMainStepType = true;
          break;
        }
      }

      if (isMainStepType && isScalar(pair.value)) {
        // Find the step node (parent containing the type) - should be the immediate parent map
        const immediateParent = ancestors[ancestors.length - 1];
        if (isMap(immediateParent) && 'items' in immediateParent && immediateParent.items) {
          // Ensure this is a step node by checking it has both 'name' and 'type' fields
          const hasName = immediateParent.items.some(
            (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'name'
          );
          const hasType = immediateParent.items.some(
            (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
          );

          if (hasName && hasType) {
            stepNodes.push(immediateParent);
          }
        }
      }
    },
  });

  return stepNodes;
};

const getTriggerNodesWithType = (yamlDocument: YAML.Document): any[] => {
  const triggerNodes: any[] = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        // Find the trigger node (parent containing the type)
        for (let i = path.length - 1; i >= 0; i--) {
          const ancestor = path[i];
          if (isMap(ancestor) && 'items' in ancestor && ancestor.items) {
            // Check if this map contains a type field
            const hasType = ancestor.items.some(
              (item: any) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
            );
            if (hasType) {
              triggerNodes.push(ancestor);
              break;
            }
          }
        }
      }
    },
  });

  return triggerNodes;
};

const WorkflowSchemaUri = 'file:///workflow-schema.json';

const useWorkflowJsonSchema = () => {
  const { data: connectorsData } = useAvailableConnectors();

  // Generate JSON schema dynamically to include all current connectors (static + dynamic)
  // Now uses lazy loading to keep large generated files out of main bundle
  return useMemo(() => {
    try {
      const zodSchema = getWorkflowZodSchema(connectorsData?.connectorTypes);
      const jsonSchema = getJsonSchemaFromYamlSchema(zodSchema);

      // Post-process to improve validation messages and add display names for connectors
      const processedSchema = improveTypeFieldDescriptions(jsonSchema, connectorsData);

      return processedSchema ?? null;
    } catch (error) {
      // console.error('🚨 Schema generation failed:', error);
      return null;
    }
  }, [connectorsData?.connectorTypes]);
};

/**
 * Enhance the JSON schema to show display names for connector types
 * This improves the Monaco YAML autocompletion experience
 */
function improveTypeFieldDescriptions(schema: any, connectorsData?: any): any {
  if (!schema || !connectorsData?.connectorTypes) {
    return schema;
  }

  // Create a mapping from actionTypeId to display name
  const typeToDisplayName: Record<string, string> = {};
  Object.values(connectorsData.connectorTypes).forEach((connector: any) => {
    typeToDisplayName[connector.actionTypeId] = connector.displayName;
  });

  // Recursively enhance the schema to add titles for connector types
  function enhanceSchema(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(enhanceSchema);
    }

    const enhanced = { ...obj };

    // Look for discriminated union schemas with connector types
    if (enhanced.anyOf || enhanced.oneOf) {
      const unionArray = enhanced.anyOf || enhanced.oneOf;
      const enhancedUnion = unionArray.map((item: any) => {
        if (item.properties?.type?.const && typeToDisplayName[item.properties.type.const]) {
          return {
            ...item,
            title: typeToDisplayName[item.properties.type.const],
            properties: {
              ...item.properties,
              type: {
                ...item.properties.type,
                title: typeToDisplayName[item.properties.type.const],
                description: `${typeToDisplayName[item.properties.type.const]} connector`,
              },
            },
          };
        }
        return enhanceSchema(item);
      });

      if (enhanced.anyOf) {
        enhanced.anyOf = enhancedUnion;
      } else {
        enhanced.oneOf = enhancedUnion;
      }
    }

    // Recursively enhance nested objects
    Object.keys(enhanced).forEach((key) => {
      if (key !== 'anyOf' && key !== 'oneOf') {
        enhanced[key] = enhanceSchema(enhanced[key]);
      }
    });

    return enhanced;
  }

  return enhanceSchema(schema);
}

/**
 * Inject dynamic CSS for connector icons in Monaco autocompletion
 * This creates CSS rules for each connector type to show custom icons
 */
async function injectDynamicConnectorIcons(connectorTypes: Record<string, any>, services: any) {
  console.log(
    '🎯 injectDynamicConnectorIcons called with:',
    Object.keys(connectorTypes).length,
    'connectors'
  );

  const styleId = 'dynamic-connector-icons';

  // Remove existing dynamic styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let css = '';

  for (const connector of Object.values(connectorTypes)) {
    const connectorType = (connector as any).actionTypeId;
    const displayName = (connector as any).displayName;

    // Skip if we already have hardcoded CSS for this connector
    if (['elasticsearch', 'kibana'].some((type) => connectorType.includes(type))) {
      continue;
    }

    try {
      // Generate CSS rule for this connector - try multiple targeting strategies
      const iconBase64 = await getConnectorIconBase64(connectorType, services);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        // Handle base connector type extraction properly
        let baseConnectorType: string;
        if (connectorType.startsWith('.')) {
          // For connectors like ".jira", remove the leading dot
          baseConnectorType = connectorType.substring(1);
        } else if (connectorType.includes('.')) {
          // For connectors like "thehive.createAlert", use base name
          baseConnectorType = connectorType.split('.')[0];
        } else {
          // For simple connectors like "slack", use as-is
          baseConnectorType = connectorType;
        }

        css += `
        /* Strategy 1: Target by aria-label content - be more specific to avoid conflicts */
        .monaco-list .monaco-list-row[aria-label^="${connectorType},"] .suggest-icon:before,
        .monaco-list .monaco-list-row[aria-label$=", ${connectorType}"] .suggest-icon:before,
        .monaco-list .monaco-list-row[aria-label*=", ${connectorType},"] .suggest-icon:before,
        .monaco-list .monaco-list-row[aria-label="${connectorType}"] .suggest-icon:before,
        .monaco-list .monaco-list-row[aria-label*="${displayName}"] .suggest-icon:before {
          background-image: url("data:image/svg+xml;base64,${iconBase64}") !important;
          background-size: 16px 16px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          content: " " !important;
          width: 16px !important;
          height: 16px !important;
          display: block !important;
        }
        
        /* Strategy 2: Target by detail text (fallback) - be more specific */
        .monaco-list .monaco-list-row .suggest-detail:contains("${connectorType}") ~ .suggest-icon:before {
          background-image: url("data:image/svg+xml;base64,${iconBase64}") !important;
        }
      `;
      }
    } catch (error) {
      console.warn('🔍 Failed to generate icon for connector:', connectorType, error);
    }
  }

  // Inject the CSS
  if (css) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/**
 * Inject dynamic CSS for connector shadow icons (::after pseudo-elements)
 * This creates CSS rules for each connector type to show custom icons in the editor
 */
async function injectDynamicShadowIcons(connectorTypes: Record<string, any>, services: any) {
  // console.log('🎯 injectDynamicShadowIcons called with:', Object.keys(connectorTypes).length, 'connectors');

  const styleId = 'dynamic-shadow-icons';

  // Remove existing dynamic shadow styles
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS for each connector type
  let css = '';

  for (const connector of Object.values(connectorTypes)) {
    const connectorType = (connector as any).actionTypeId;

    // Skip if we already have hardcoded CSS for this connector
    if (
      [
        'elasticsearch',
        'kibana',
        'console',
        'http',
        'foreach',
        'if',
        'parallel',
        'merge',
        'wait',
      ].some((type) => connectorType.includes(type))
    ) {
      continue;
    }

    try {
      // Generate CSS rule for this connector shadow icon
      const iconBase64 = await getConnectorIconBase64(connectorType, services);

      // Only inject CSS if we successfully generated an icon
      if (iconBase64) {
        // Get the class name for this connector (same logic as getConnectorIcon)
        let className = connectorType;
        if (connectorType.startsWith('elasticsearch.')) {
          className = 'elasticsearch';
        } else if (connectorType.startsWith('kibana.')) {
          className = 'kibana';
        } else {
          // Handle connectors with dot notation properly
          if (connectorType.startsWith('.')) {
            // For connectors like ".jira", remove the leading dot
            className = connectorType.substring(1);
          } else if (connectorType.includes('.')) {
            // For connectors like "thehive.createAlert", use base name
            className = connectorType.split('.')[0];
          } else {
            // For simple connectors like "slack", use as-is
            className = connectorType;
          }
        }

        css += `
        .connector-inline-highlight.connector-${className}::after {
          background-image: url("data:image/svg+xml;base64,${iconBase64}");
          background-size: contain;
          background-repeat: no-repeat;
        }
        `;
      }
    } catch (error) {
      console.warn('🔍 Failed to generate shadow icon for connector:', connectorType, error);
    }
  }

  // Inject the CSS
  if (css) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
    // console.log('✅ Dynamic shadow icon CSS injected:', css.length, 'characters');
  }
}

/**
 * Default fallback SVG for unknown connectors
 */
const DEFAULT_CONNECTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="8" cy="8" r="2" fill="currentColor"/>
</svg>`;

/**
 * Get base64 encoded SVG icon for a connector type (super simplified!)
 * Uses regular imports - much cleaner!
 */
async function getConnectorIconBase64(connectorType: string, services: any): Promise<string> {
  // console.log('🔍 getConnectorIconBase64 called for:', connectorType);

  try {
    // First, try to get the logo directly from stack connectors (regular import!)
    if (connectorType in STACK_CONNECTOR_LOGOS) {
      const LogoComponent =
        STACK_CONNECTOR_LOGOS[connectorType as keyof typeof STACK_CONNECTOR_LOGOS];

      // Render the actual logo component to HTML string
      const logoElement = React.createElement(LogoComponent, { width: 32, height: 32 });
      let htmlString = renderToStaticMarkup(logoElement);

      // Check if it's an <img> tag (imported SVG) or direct <svg>
      const isImgTag = htmlString.includes('<img');

      if (isImgTag) {
        // Extract the src attribute from the img tag
        const srcMatch = htmlString.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {
          const srcValue = srcMatch[1];

          // If it's already a data URL, extract the base64 part
          if (srcValue.startsWith('data:image/svg+xml;base64,')) {
            const base64 = srcValue.replace('data:image/svg+xml;base64,', '');
            return base64;
          }

          // If it's a different data URL format, return it as is
          if (srcValue.startsWith('data:')) {
            // Convert to base64 if needed
            const base64 = btoa(srcValue);
            return base64;
          }

          // If it's a regular URL/path, we can't easily convert it here
          console.warn('🔍 Cannot convert external image URL to base64:', srcValue);
        }
      } else {
        // It's a direct SVG - handle as before
        const hasFillNone = /fill="none"/i.test(htmlString);

        if (hasFillNone) {
          // Remove fill="none" and add currentColor fill
          htmlString = htmlString
            .replace(/fill="none"/gi, '')
            .replace(/fill='none'/gi, '')
            .replace(/<svg([^>]*?)>/, '<svg$1 fill="currentColor">');
        }
      }

      const base64 = btoa(htmlString);

      return base64;
    }

    // Handle connectors that use EUI built-in icons instead of custom logo components
    if (connectorType === '.slack' || connectorType === '.slack_api') {
      // hardcoded slack logo
      return 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==';
    }

    if (connectorType === '.email') {
      // hardcoded email logo
      return 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTQuOTQ5MTk3NCwzLjY4NDQ1ODIgTDguNjM3ODk4NDgsOC45MTIxNzAyNiBDOC4yNjc4NjA2Myw5LjIxODY3NjMxIDcuNzMyMTM5MzcsOS4yMTg2NzYzMSA3LjM2MjEwMTUyLDguOTEyMTcwMjYgTDEuMDUwODAyNTUsMy42ODQ0NTgyIEMxLjAxNzg0NDMyLDMuNzgzNjUwNzcgMSwzLjg4OTc0MTUgMSw0IEwxLDEyIEMxLDEyLjU1MjI4NDcgMS40NDc3MTUyNSwxMyAyLDEzIEwxNCwxMyBDMTQuNTUyMjg0NywxMyAxNSwxMi41NTIyODQ3IDE1LDEyIEwxNSw0IEMxNSwzLjg4OTc0MTUgMTQuOTgyMTU1NywzLjc4MzY1MDc3IDE0Ljk0OTE5NzQsMy42ODQ0NTgyIFogTTIsMiBMMTQsMiBDMTUuMTA0NTY5NSwyIDE2LDIuODk1NDMwNSAxNiw0IEwxNiwxMiBDMTYsMTMuMTA0NTY5NSAxNS4xMDQ1Njk1LDE0IDE0LDE0IEwyLDE0IEMwLjg5NTQzMDUsMTQgMS4zNTI3MDc1ZS0xNiwxMy4xMDQ1Njk1IDAsMTIgTDAsNCBDLTEuMzUyNzA3NWUtMTYsMi44OTU0MzA1IDAuODk1NDMwNSwyIDIsMiBaIE0xLjc4OTY5MzExLDMgTDcuMzY2MzI4MzYsNy42MDMzOTcxNyBDNy43MzQ1OTA0Miw3LjkwNzM4OTg5IDguMjY2Mzk5MjQsNy45MDg1OTQzMiA4LjYzNjAzNDQ2LDcuNjA2MjcyNzcgTDE0LjI2NzkyMSwzIEwxLjc4OTY5MzExLDMgWiIgLz4KPC9zdmc+Cg==';
    }

    // Fallback to default icon for other connector types
    return btoa(DEFAULT_CONNECTOR_SVG);
  } catch (error) {
    console.warn('🔍 Failed to generate icon for', connectorType, ':', error);
    // Fallback to default static icon
    return btoa(DEFAULT_CONNECTOR_SVG);
  }
}

export interface WorkflowYAMLEditorProps {
  workflowId?: string;
  filename?: string;
  readOnly?: boolean;
  hasChanges?: boolean;
  lastUpdatedAt?: Date;
  highlightStep?: string;
  stepExecutions?: WorkflowStepExecutionDto[];
  'data-testid'?: string;
  value: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
  onChange?: (value: string | undefined) => void;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
  onSave?: (value: string) => void;
  esHost?: string;
  kibanaHost?: string;
  activeTab?: string;
  selectedExecutionId?: string;
  originalValue?: string;
}

export const WorkflowYAMLEditor = ({
  workflowId,
  filename = `${workflowId}.yaml`,
  readOnly = false,
  hasChanges = false,
  lastUpdatedAt,
  highlightStep,
  stepExecutions,
  onMount,
  onChange,
  onSave,
  onValidationErrors,
  esHost = 'http://localhost:9200',
  kibanaHost,
  activeTab,
  selectedExecutionId,
  originalValue,
  ...props
}: WorkflowYAMLEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { http, notifications, ...otherServices },
  } = useKibana<CoreStart>();

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const { data: connectorsData } = useAvailableConnectors();

  // Add dynamic connectors to cache when data is fetched
  useEffect(() => {
    if (connectorsData?.connectorTypes) {
      addDynamicConnectorsToCache(connectorsData.connectorTypes);
      // Inject dynamic CSS for connector icons
      // Note: We don't await this to avoid blocking the UI
      injectDynamicConnectorIcons(connectorsData.connectorTypes, {
        ...otherServices,
        http,
        notifications,
      });
      // Inject dynamic CSS for shadow icons (::after pseudo-elements)
      injectDynamicShadowIcons(connectorsData.connectorTypes, {
        ...otherServices,
        http,
        notifications,
      });
    }
  }, [connectorsData?.connectorTypes, otherServices, http, notifications]);

  // Add debug functions to window in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('../lib/connector_logo_debug').then(({ addDebugToWindow }) => {
        addDebugToWindow({ ...otherServices, http, notifications });
      });
    }
  }, [otherServices, http, notifications]);

  const workflowJsonSchema = useWorkflowJsonSchema();
  const schemas: SchemasSettings[] = useMemo(() => {
    return [
      {
        fileMatch: ['*'],
        // casting here because zod-to-json-schema returns a more complex type than JSONSchema7 expected by monaco-yaml
        schema: workflowJsonSchema as any,
        uri: WorkflowSchemaUri,
      },
    ];
  }, [workflowJsonSchema]);

  const [yamlDocument, setYamlDocument] = useState<YAML.Document | null>(null);
  const yamlDocumentRef = useRef<YAML.Document | null>(null);
  const stepExecutionsRef = useRef<WorkflowStepExecutionDto[] | undefined>(stepExecutions);

  // Keep stepExecutionsRef in sync
  useEffect(() => {
    stepExecutionsRef.current = stepExecutions;
  }, [stepExecutions]);

  // REMOVED: highlightStepDecorationCollectionRef - now handled by UnifiedActionsProvider
  // REMOVED: stepExecutionsDecorationCollectionRef - now handled by StepExecutionProvider
  const alertTriggerDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const triggerTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const connectorTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const unifiedProvidersRef = useRef<{
    hover: any;
    actions: any;
    stepExecution: any;
  } | null>(null);

  // Disposables for Monaco providers
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  const [editorActionsCss, setEditorActionsCss] = useState<React.CSSProperties>({
    display: 'none',
  });

  // Memoize the schema to avoid re-generating it on every render
  const workflowYamlSchemaLoose = useMemo(() => {
    return getWorkflowZodSchemaLoose(connectorsData?.connectorTypes); // Now uses lazy loading with dynamic connectors
  }, [connectorsData?.connectorTypes]);

  const changesHighlightDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const {
    error: errorValidating,
    validationErrors,
    validateVariables,
    handleMarkersChanged,
  } = useYamlValidation({
    workflowYamlSchema: workflowYamlSchemaLoose,
    onValidationErrors,
  });

  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [showDiffHighlight, setShowDiffHighlight] = useState(false);

  // Helper to compute diff lines
  const calculateLineDifferences = useCallback((original: string, current: string) => {
    const originalLines = (original ?? '').split('\n');
    const currentLines = (current ?? '').split('\n');
    const changed: number[] = [];
    const max = Math.max(originalLines.length, currentLines.length);
    for (let i = 0; i < max; i++) {
      if ((originalLines[i] ?? '') !== (currentLines[i] ?? '')) changed.push(i + 1);
    }
    return changed;
  }, []);

  // Apply diff highlight when toggled
  useEffect(() => {
    if (!showDiffHighlight || !originalValue || !editorRef.current || !isEditorMounted) {
      if (changesHighlightDecorationCollectionRef.current) {
        changesHighlightDecorationCollectionRef.current.clear();
      }
      return;
    }
    const model = editorRef.current.getModel();
    if (!model) return;
    if (changesHighlightDecorationCollectionRef.current) {
      changesHighlightDecorationCollectionRef.current.clear();
    }
    const changedLines = calculateLineDifferences(originalValue, props.value ?? '');
    if (changedLines.length === 0) return;
    const decorations = changedLines.map((lineNumber) => ({
      range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
      options: {
        className: 'changed-line-highlight',
        isWholeLine: true,
        marginClassName: 'changed-line-margin',
      },
    }));
    changesHighlightDecorationCollectionRef.current =
      editorRef.current.createDecorationsCollection(decorations);
    return () => {
      changesHighlightDecorationCollectionRef.current?.clear();
    };
  }, [showDiffHighlight, originalValue, isEditorMounted, props.value, calculateLineDifferences]);

  // Add a ref to track if the last change was just typing
  const lastChangeWasTypingRef = useRef(false);

  // Track the last value we set internally to distinguish from external changes
  const lastInternalValueRef = useRef<string | undefined>(props.value);

  // Helper function to clear all decorations
  const clearAllDecorations = useCallback(() => {
    if (alertTriggerDecorationCollectionRef.current) {
      alertTriggerDecorationCollectionRef.current.clear();
    }
    if (triggerTypeDecorationCollectionRef.current) {
      triggerTypeDecorationCollectionRef.current.clear();
    }
    if (connectorTypeDecorationCollectionRef.current) {
      connectorTypeDecorationCollectionRef.current.clear();
    }
    // Also clear step execution decorations
    if (unifiedProvidersRef.current?.stepExecution) {
      unifiedProvidersRef.current.stepExecution.dispose();
      unifiedProvidersRef.current.stepExecution = null;
    }
    // Clear unified actions provider highlighting
    if (unifiedProvidersRef.current?.actions) {
      // The actions provider will clear its own decorations on next update
    }
  }, []);

  // ... existing code ...

  const changeSideEffects = useCallback(
    (isTypingChange = false) => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (!model) {
          return;
        }
        validateVariables(editorRef.current);
        try {
          const value = model.getValue();
          const parsedDocument = YAML.parseDocument(value ?? '');

          if (isTypingChange) {
            // If it's because of typing - skip clearing decorations entirely
            // Let the decoration hooks handle updates naturally
          } else {
            // If not typing - continue with the original logic (always clear)
            clearAllDecorations();
          }

          setYamlDocument(parsedDocument);
          yamlDocumentRef.current = parsedDocument;
        } catch (error) {
          // console.error('❌ Error parsing YAML document:', error);
          clearAllDecorations();
          setYamlDocument(null);
          yamlDocumentRef.current = null;
        }
      }
    },
    [validateVariables, clearAllDecorations]
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      // Track this as an internal change BEFORE calling onChange
      lastInternalValueRef.current = value;

      if (onChange) {
        onChange(value);
      }

      // Pass the typing flag to changeSideEffects
      changeSideEffects(lastChangeWasTypingRef.current);
      // Reset the flag
      lastChangeWasTypingRef.current = false;
    },
    [onChange, changeSideEffects]
  );

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    editor.updateOptions({
      glyphMargin: true,
    });

    // Listen to content changes to detect typing
    const model = editor.getModel();
    if (model) {
      model.onDidChangeContent((e) => {
        // Check if this was a simple typing change
        const isSimpleTyping =
          e.changes.length === 1 &&
          e.changes[0].text.length <= 1 && // Single character or deletion
          !e.changes[0].text.includes('\n'); // No line breaks

        lastChangeWasTypingRef.current = isSimpleTyping;
      });

      // Initial YAML parsing from main
      const value = model.getValue();
      if (value && value.trim() !== '') {
        validateVariables(editor);
        try {
          const parsedDocument = YAML.parseDocument(value);
          // Use setTimeout to defer state updates until after the current render cycle
          // This prevents the flushSync warning while maintaining the correct order
          setTimeout(() => {
            setYamlDocument(parsedDocument);
            setIsEditorMounted(true);
          }, 0);
        } catch (error) {
          setTimeout(() => {
            setYamlDocument(null);
            setIsEditorMounted(true);
          }, 0);
        }
      } else {
        // If no content, just set the mounted state
        setTimeout(() => {
          setIsEditorMounted(true);
        }, 0);
      }
    } else {
      // If no model, just set the mounted state
      setTimeout(() => {
        setIsEditorMounted(true);
      }, 0);
    }

    // Setup Elasticsearch step providers if we have the required services
    if (http && notifications) {
      // Register Elasticsearch connector handler
      const elasticsearchHandler = new ElasticsearchMonacoConnectorHandler({
        http,
        notifications: notifications as any, // Temporary type cast
        // esHost,
        // kibanaHost || window.location.origin,
      });
      registerMonacoConnectorHandler(elasticsearchHandler);

      // Register Kibana connector handler
      const kibanaHandler = new KibanaMonacoConnectorHandler({
        http,
        notifications: notifications as any, // Temporary type cast
        kibanaHost: kibanaHost || window.location.origin,
      });
      registerMonacoConnectorHandler(kibanaHandler);

      // Create unified providers
      const providerConfig = {
        getYamlDocument: () => yamlDocumentRef.current,
        options: {
          http,
          notifications: notifications as any,
          esHost,
          kibanaHost: kibanaHost || window.location.origin,
        },
      };

      // Register hover provider with Monaco
      const hoverDisposable = registerUnifiedHoverProvider(providerConfig);
      disposablesRef.current.push(hoverDisposable);

      // Create other providers
      const actionsProvider = createUnifiedActionsProvider(editor, providerConfig);
      // Decorations provider disabled - user prefers only step background highlighting, not green dots
      // const decorationsProvider = createUnifiedDecorationsProvider(editor, providerConfig);

      // Setup event listener for CSS updates from actions provider
      const handleCssUpdate = (event: CustomEvent) => {
        setEditorActionsCss(event.detail || {});
      };
      window.addEventListener('updateEditorActionsCss', handleCssUpdate as EventListener);
      disposablesRef.current.push({
        dispose: () => {
          window.removeEventListener('updateEditorActionsCss', handleCssUpdate as EventListener);
        },
      });

      // Store provider references
      unifiedProvidersRef.current = {
        hover: null, // hover provider is managed by Monaco directly
        actions: actionsProvider,
        stepExecution: null, // will be created when needed
      };
    }

    onMount?.(editor, monaco);
  };

  useEffect(() => {
    // After editor is mounted or workflowId changes, validate the initial content
    if (isEditorMounted && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== '') {
        changeSideEffects(false); // Initial validation, not typing
      }
    }
  }, [changeSideEffects, isEditorMounted, workflowId]);

  // Force refresh of decorations when props.value changes externally (e.g., switching executions)
  useEffect(() => {
    if (isEditorMounted && editorRef.current && props.value !== undefined) {
      // Check if this is an external change (not from our own typing)
      const isExternalChange = props.value !== lastInternalValueRef.current;

      if (isExternalChange) {
        // Always clear decorations first when switching executions/revisions
        clearAllDecorations();

        // Check if Monaco editor content matches props.value
        const model = editorRef.current.getModel();
        if (model) {
          const currentContent = model.getValue();
          if (currentContent !== props.value) {
            // Wait a bit longer for Monaco to update its content, then force re-parse
            setTimeout(() => {
              changeSideEffects(false); // External change, not typing
            }, 50); // Longer delay to ensure Monaco editor content is updated
          } else {
            // Content matches, just force re-parse to be safe
            setTimeout(() => {
              changeSideEffects(false); // External change, not typing
            }, 10);
          }
        }

        // Update our tracking ref
        lastInternalValueRef.current = props.value;
      }
    }
  }, [props.value, isEditorMounted, changeSideEffects, clearAllDecorations]);

  // Force decoration refresh specifically when switching to readonly mode (executions view)
  useEffect(() => {
    if (isEditorMounted && readOnly) {
      // Small delay to ensure all state is settled
      setTimeout(() => {
        changeSideEffects(false); // Mode change, not typing
      }, 50);
    }
  }, [readOnly, isEditorMounted, changeSideEffects]);

  // Step execution provider - managed through provider architecture
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current) {
      return;
    }

    // Always dispose existing provider when dependencies change to prevent stale decorations
    if (unifiedProvidersRef.current?.stepExecution) {
      unifiedProvidersRef.current.stepExecution.dispose();
      unifiedProvidersRef.current.stepExecution = null;
    }

    // Create step execution provider if needed and we're in readonly mode
    // Add a small delay to ensure YAML document is fully updated when switching executions
    const timeoutId = setTimeout(() => {
      try {
        if (readOnly) {
          // Ensure yamlDocumentRef is synchronized
          if (yamlDocument && !yamlDocumentRef.current) {
            yamlDocumentRef.current = yamlDocument;
          }

          // Additional check: if we have stepExecutions but no yamlDocument,
          // the document might not be parsed yet - skip and let next update handle it
          if (stepExecutions && stepExecutions.length > 0 && !yamlDocumentRef.current) {
            // console.warn(
            //   '🎯 StepExecutions present but no YAML document - waiting for document parse'
            // );
            return;
          }

          const stepExecutionProvider = createStepExecutionProvider(editorRef.current!, {
            getYamlDocument: () => {
              return yamlDocumentRef.current;
            },
            getStepExecutions: () => {
              return stepExecutionsRef.current || [];
            },
            getHighlightStep: () => highlightStep || null,
            isReadOnly: () => readOnly,
          });

          if (unifiedProvidersRef.current) {
            unifiedProvidersRef.current.stepExecution = stepExecutionProvider;
          }
        }
      } catch (error) {
        // console.error('🎯 WorkflowYAMLEditor: Error creating StepExecutionProvider:', error);
      }
    }, 20); // Small delay to ensure YAML document is ready

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, stepExecutions, highlightStep, yamlDocument, readOnly]);

  useEffect(() => {
    const model = editorRef.current?.getModel() ?? null;
    if (alertTriggerDecorationCollectionRef.current) {
      // clear existing decorations
      alertTriggerDecorationCollectionRef.current.clear();
    }

    // Don't show alert dots when in executions view or when prerequisites aren't met
    if (!model || !yamlDocument || !isEditorMounted || readOnly || !editorRef.current) {
      return;
    }

    const triggerNodes = getTriggerNodes(yamlDocument);
    const alertTriggers = triggerNodes.filter(({ triggerType }) => triggerType === 'alert');

    if (alertTriggers.length === 0) {
      return;
    }

    const decorations = alertTriggers
      .map(({ node, typePair }) => {
        // Try to get the range from the typePair first, fallback to searching within the trigger node
        let typeRange = getMonacoRangeFromYamlNode(model, typePair);

        if (!typeRange) {
          // Fallback: use the trigger node range and search for the type line
          const triggerRange = getMonacoRangeFromYamlNode(model, node);
          if (!triggerRange) {
            return null;
          }

          // Find the specific line that contains "type:" and "alert" within this trigger
          let typeLineNumber = triggerRange.startLineNumber;
          for (
            let lineNum = triggerRange.startLineNumber;
            lineNum <= triggerRange.endLineNumber;
            lineNum++
          ) {
            const lineContent = model.getLineContent(lineNum);
            if (lineContent.includes('type:') && lineContent.includes('alert')) {
              typeLineNumber = lineNum;
              break;
            }
          }

          typeRange = new monaco.Range(
            typeLineNumber,
            1,
            typeLineNumber,
            model.getLineMaxColumn(typeLineNumber)
          );
        }

        const glyphDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            glyphMarginClassName: 'alert-trigger-glyph',
            glyphMarginHoverMessage: {
              value: i18n.translate(
                'workflows.workflowDetail.yamlEditor.alertTriggerGlyphTooltip',
                {
                  defaultMessage:
                    'Alert trigger: This workflow will be executed automatically only when connected to a rule via the "Run Workflow" action.',
                }
              ),
            },
          },
        };

        const lineHighlightDecoration: monaco.editor.IModelDeltaDecoration = {
          range: new monaco.Range(
            typeRange!.startLineNumber,
            1,
            typeRange!.startLineNumber,
            model.getLineMaxColumn(typeRange!.startLineNumber)
          ),
          options: {
            className: 'alert-trigger-highlight',
            marginClassName: 'alert-trigger-highlight',
            isWholeLine: true,
          },
        };

        return [glyphDecoration, lineHighlightDecoration];
      })
      .flat()
      .filter((d) => d !== null) as monaco.editor.IModelDeltaDecoration[];

    // Ensure we have a valid editor reference before creating decorations
    if (decorations.length > 0 && editorRef.current) {
      // Small delay to ensure Monaco editor is fully ready for decorations
      // This addresses race conditions where the editor is mounted but not fully initialized
      const createDecorations = () => {
        if (editorRef.current) {
          alertTriggerDecorationCollectionRef.current =
            editorRef.current.createDecorationsCollection(decorations);
        }
      };

      // Try immediately, and if that fails, try again with a small delay
      try {
        createDecorations();
      } catch (error) {
        setTimeout(createDecorations, 10);
      }
    }
  }, [isEditorMounted, yamlDocument, readOnly]);

  // Handle connector type decorations (GitLens-style inline icons)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isEditorMounted || !editorRef.current || !yamlDocument) {
        return;
      }

      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) {
        return;
      }

      // Clear existing decorations first
      if (connectorTypeDecorationCollectionRef.current) {
        connectorTypeDecorationCollectionRef.current.clear();
        connectorTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all steps with connector types
      const stepNodes = getStepNodesWithType(yamlDocument);
      // console.log('🎨 Connector decorations: Found step nodes:', stepNodes.length);

      for (const stepNode of stepNodes) {
        // Find the main step type (not nested inside 'with' or other blocks)
        const typePair = stepNode.items.find((item: any) => {
          // Must be a direct child of the step node (not nested)
          return isPair(item) && isScalar(item.key) && item.key.value === 'type';
        });

        if (!typePair?.value?.value) continue;

        const connectorType = typePair.value.value;
        // console.log('🎨 Processing connector type:', connectorType);

        // Skip decoration for very short connector types to avoid false matches
        // allow "if" as a special case
        if (connectorType.length < 3 && connectorType !== 'if') {
          // console.log('🎨 Skipping short connector type:', connectorType);
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) continue;

        // Get icon and class based on connector type
        const { className } = getConnectorIcon(connectorType);

        if (className) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line starts with "type:" (after whitespace)
          if (!trimmedLine.startsWith('type:')) {
            continue; // Skip this decoration
          }

          // Try to find the connector type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(connectorType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(connectorType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the connector type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + connectorType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting and after content (working version)
          const decorationsToAdd = [
            // Background highlighting on the connector type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `connector-inline-highlight connector-${className}`,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      // console.log('🎨 Final decorations count:', decorations.length);
      if (decorations.length > 0) {
        connectorTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
        // console.log('🎨 Applied connector decorations successfully');
      } else {
        // console.log('🎨 No decorations to apply');
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument]);

  // Trigger type decorations effect
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current || !yamlDocument) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const editor = editorRef.current!;
      const model = editor.getModel();
      if (!model) return;

      // Clear existing trigger decorations
      if (triggerTypeDecorationCollectionRef.current) {
        triggerTypeDecorationCollectionRef.current.clear();
        triggerTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];

      // Find all triggers with type
      const triggerNodes = getTriggerNodesWithType(yamlDocument);

      for (const triggerNode of triggerNodes) {
        const typePair = triggerNode.items.find((item: any) => item.key?.value === 'type');
        if (!typePair?.value?.value) continue;

        const triggerType = typePair.value.value;

        // Skip decoration for very short trigger types to avoid false matches
        if (triggerType.length < 3) {
          continue; // Skip this iteration
        }

        const typeRange = typePair.value.range;

        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) continue;

        // Get icon and class based on trigger type
        const { className } = getTriggerIcon(triggerType);

        if (className) {
          // typeRange format: [startOffset, valueStartOffset, endOffset]
          const valueStartOffset = typeRange[1]; // Start of the value (after quotes if present)
          const valueEndOffset = typeRange[2]; // End of the value

          // Convert character offsets to Monaco positions
          const startPosition = model.getPositionAt(valueStartOffset);
          const endPosition = model.getPositionAt(valueEndOffset);

          // Get the line content to check if "type:" is at the beginning
          const currentLineContent = model.getLineContent(startPosition.lineNumber);
          const trimmedLine = currentLineContent.trimStart();

          // Check if this line contains "type:" (after whitespace and optional dash for array items)
          if (!trimmedLine.startsWith('type:') && !trimmedLine.startsWith('- type:')) {
            continue; // Skip this decoration
          }

          // Try to find the trigger type in the start position line first
          let targetLineNumber = startPosition.lineNumber;
          let lineContent = model.getLineContent(targetLineNumber);
          let typeIndex = lineContent.indexOf(triggerType);

          // If not found on start line, check end line
          if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
            targetLineNumber = endPosition.lineNumber;
            lineContent = model.getLineContent(targetLineNumber);
            typeIndex = lineContent.indexOf(triggerType);
          }

          let actualStartColumn;
          let actualEndColumn;
          if (typeIndex !== -1) {
            // Found the trigger type in the line
            actualStartColumn = typeIndex + 1; // +1 for 1-based indexing
            actualEndColumn = typeIndex + triggerType.length + 1; // +1 for 1-based indexing
          } else {
            // Fallback to calculated position
            targetLineNumber = startPosition.lineNumber;
            actualStartColumn = startPosition.column;
            actualEndColumn = endPosition.column;
          }

          // Background highlighting for trigger types
          const decorationsToAdd = [
            // Background highlighting on the trigger type text
            {
              range: {
                startLineNumber: targetLineNumber,
                startColumn: actualStartColumn,
                endLineNumber: targetLineNumber,
                endColumn: actualEndColumn,
              },
              options: {
                inlineClassName: `trigger-inline-highlight trigger-${className}`,
              },
            },
          ];

          decorations.push(...decorationsToAdd);
        }
      }

      if (decorations.length > 0) {
        triggerTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
      }
    }, 100); // Small delay to avoid multiple rapid executions

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument]);

  // Helper function to get connector icon and class
  const getConnectorIcon = (connectorType: string): { className: string } => {
    if (connectorType.startsWith('elasticsearch.')) {
      return { className: 'elasticsearch' };
    } else if (connectorType.startsWith('kibana.')) {
      return { className: 'kibana' };
    } else {
      // Handle connectors with dot notation properly
      let className: string;
      if (connectorType.startsWith('.')) {
        // For connectors like ".jira", remove the leading dot
        className = connectorType.substring(1);
      } else if (connectorType.includes('.')) {
        // For connectors like "thehive.createAlert", use base name
        className = connectorType.split('.')[0];
      } else {
        // For simple connectors like "slack", use as-is
        className = connectorType;
      }
      return { className };
    }
  };

  // Helper function to get trigger icon and class
  const getTriggerIcon = (triggerType: string): { className: string } => {
    switch (triggerType) {
      case 'alert':
        return { className: 'alert' };
      case 'scheduled':
        return { className: 'scheduled' };
      case 'manual':
        return { className: 'manual' };
      default:
        return { className: triggerType };
    }
  };

  const completionProvider = useMemo(() => {
    return getCompletionItemProvider(workflowYamlSchemaLoose);
  }, [workflowYamlSchemaLoose]);

  useEffect(() => {
    monaco.editor.defineTheme('workflows-subdued', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': euiTheme.colors.backgroundBaseSubdued,
      },
    });

    // Add global CSS for Monaco hover widgets - avoid interfering with internal widgets
    const styleId = 'workflow-monaco-hover-styles';
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Enhanced Monaco hover styling for workflow editor - EXCLUDE glyph and contrib widgets */
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]),
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) {
          width: 600px;
          min-width: 500px;
          max-width: 800px;
          max-height: 400px;
          font-size: 13px;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
          padding: 12px 16px;
        }
        
        .monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents,
        .monaco-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents {
          width: 100%;
          min-width: 500px;
          max-width: 800px;
        }
        
        /* Ensure Monaco's internal glyph hover widgets are never hidden */
        .monaco-editor [class*="modesGlyphHoverWidget"],
        .monaco-editor [class*="glyph"][class*="hover"] {
          display: block !important;
          visibility: visible !important;
        }
        
        /* Connector type decorations - GitLens style inline icons */
        .connector-decoration {
          margin-left: 4px;
          pointer-events: none;
          user-select: none;
          display: inline-block;
          position: relative;
          opacity: 0.8;
        }
        
        /* Subtle background highlighting for connector types only */
        .connector-inline-highlight {
          background-color: rgba(255, 165, 0, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }
        
        .connector-inline-highlight.connector-elasticsearch {
          background-color: rgba(255, 215, 0, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 215, 0, 0.2) !important;
        }
        
        .connector-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }

        /* FOR SHADOW ICONS */
        /* Dynamic connector shadow icons are now handled by injectDynamicShadowIcons() function */
        /* Only built-in connector types (elasticsearch, kibana, inference, etc.) remain hardcoded below */
   

        .connector-inline-highlight.connector-elasticsearch::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyBkYXRhLXR5cGU9ImxvZ29FbGFzdGljIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDMyIDMyIj4KPHBhdGggZD0iTTI3LjU2NDggMTEuMjQyNUMzMi42NjU0IDEzLjE4MiAzMi40MzczIDIwLjYzNzggMjcuMzE5NyAyMi4zNjk0TDI3LjE1NzYgMjIuNDI0MUwyNi45OTA2IDIyLjM4NTFMMjEuNzEwMyAyMS4xNDY4TDIxLjQ0MjcgMjEuMDg0M0wyMS4zMTU4IDIwLjg0MDFMMTkuOTE1NCAxOC4xNDk3TDE5LjY5ODYgMTcuNzMyN0wyMC4wNTExIDE3LjQyMjJMMjYuOTU1NCAxMS4zNTI4TDI3LjIyNjkgMTEuMTEzNkwyNy41NjQ4IDExLjI0MjVaIiBmaWxsPSIjMEI2NEREIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNMjIuMDQ3MiAyMS4yMzlMMjYuODQ3IDIyLjM2NEwyNy4xNjI1IDIyLjQzODJMMjcuMjczOCAyMi43NDE5TDI3LjMzOTIgMjIuOTMyNEMyNy45NjE1IDI0Ljg5NjIgMjcuMDc5NyAyNi43MTE3IDI1LjY4NjkgMjcuNzI5MkMyNC4yNTI4IDI4Ljc3NjcgMjIuMTc3NSAyOS4wNDg4IDIwLjUwNTIgMjcuNzUwN0wyMC4yMTUyIDI3LjUyNjFMMjAuMjgzNiAyNy4xNjQ4TDIxLjMyMDcgMjEuNzEwN0wyMS40Mzc5IDIxLjA5NjRMMjIuMDQ3MiAyMS4yMzlaIiBmaWxsPSIjOUFEQzMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNS4wMTA3NCA5LjYyOTk3TDEwLjI3NzMgMTAuODg0OUwxMC41NTk2IDEwLjk1MjJMMTAuNjgxNiAxMS4yMTU5TDExLjkxNyAxMy44NjUzTDEyLjEwMzUgMTQuMjY2N0wxMS43NzY0IDE0LjU2MzZMNS4wNDI5NyAyMC42NjQyTDQuNzcwNTEgMjAuOTEyMkw0LjQyNTc4IDIwLjc4MDRDMS45Mzg5IDE5LjgzMDMgMC43MjA0MDcgMTcuNDU1OCAwLjc1MTk1MyAxNS4xNTM0QzAuNzgzNjg2IDEyLjg0NTMgMi4wNzMwNSAxMC41MDk0IDQuNjgzNTkgOS42NDQ2Mkw0Ljg0NTcgOS41OTA5MUw1LjAxMDc0IDkuNjI5OTdaIiBmaWxsPSIjMUJBOUY1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNi4yODEwMSA0LjMxOTgyQzcuNjk3MjMgMy4yMzk0IDkuNzYxMzUgMi45MzM0IDExLjUwMjcgNC4yNTE0NkwxMS43OTk2IDQuNDc3MDVMMTEuNzI5MiA0Ljg0MzI2TDEwLjY3NzUgMTAuMzE2OUwxMC41NTkzIDEwLjkzMjFMOS45NDk5NSAxMC43ODc2TDUuMTUwMTUgOS42NTA4OEw0LjgzMzc0IDkuNTc1NjhMNC43MjMzOSA5LjI3MDAyQzQuMDE1MDcgNy4zMDI5NSA0Ljg3MjYzIDUuMzk0MjkgNi4yODEwMSA0LjMxOTgyWiIgZmlsbD0iI0YwNEU5OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPHBhdGggZD0iTTEyLjQ2NjEgMTQuNDMzMUwxOS40OTYzIDE3LjY0NEwxOS42ODM4IDE3LjczTDE5Ljc3ODYgMTcuOTEyNkwyMS4zMzQyIDIwLjg5NzlMMjEuNDI5OSAyMS4wODI1TDIxLjM5MDkgMjEuMjg3NkwyMC4yMjQ5IDI3LjM4OTJMMjAuMjAxNCAyNy41MTEyTDIwLjEzMzEgMjcuNjEzOEMxNy40NTM0IDMxLjU3MiAxMy4yMzA1IDMyLjMyNDUgOS44NjQ1IDMwLjg3MzVDNi41MDkzMiAyOS40MjcyIDQuMDMwNyAyNS44MDQ0IDQuNzM5NSAyMS4xMzgyTDQuNzcxNzMgMjAuOTI3Mkw0LjkyOTkzIDIwLjc4MzdMMTEuODEzNyAxNC41MzQ3TDEyLjEwNjcgMTQuMjY5TDEyLjQ2NjEgMTQuNDMzMVoiIGZpbGw9IiMwMkJDQjciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+CjxwYXRoIGQ9Ik0xMS44OTIzIDQuNDEwMjJDMTQuNDM4MSAwLjY3NjQyNiAxOC43NDEgMC4xMDUzMDMgMjIuMTMzNSAxLjUzOTEyQzI1LjUyNjMgMi45NzMwMiAyOC4xMjMxIDYuNDU5NzkgMjcuMjM2MSAxMC45MDI0TDI3LjE5NyAxMS4xMDE2TDI3LjA0MzcgMTEuMjM1NEwxOS45NzgzIDE3LjQ0ODNMMTkuNjg1MyAxNy43MDYxTDE5LjMzMTggMTcuNTQzTDEyLjMyOTggMTQuMzMyMUwxMi4xMjg3IDE0LjI0MDNMMTIuMDM0OSAxNC4wMzkxTDEwLjY1NSAxMS4wNTE4TDEwLjU3NCAxMC44NzUxTDEwLjYxMTEgMTAuNjg0NkwxMS43OTk2IDQuNjMyODdMMTEuODIzIDQuNTExNzhMMTEuODkyMyA0LjQxMDIyWiIgZmlsbD0iI0ZFQzUxNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPC9zdmc+");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-slack::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-kibana::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQpIj4KICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMjguNzg5IDI0LjkzNSAuMDE3Ii8+CiAgICA8cGF0aCBjbGFzcz0iZXVpSWNvbl9fZmlsbE5lZ2F0aXZlIiBkPSJNMCwxMiBMMCwyOC43ODkgTDExLjkwNiwxNS4wNTEgQzguMzY4LDEzLjExNSA0LjMxNywxMiAwLDEyIi8+CiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTQuNDc4NSwxNi42NjQgTDIuMjY3NSwzMC43NTQgTDEuMTk0NSwzMS45OTEgTDI0LjM4NjUsMzEuOTkxIEMyMy4xMzQ1LDI1LjY5OSAxOS41MDM1LDIwLjI3MiAxNC40Nzg1LDE2LjY2NCIvPgogIDwvZz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-inference::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAuNWEuNS41IDAgMCAwLTEgMGMwIC40Mi0uMTMgMS4wNjEtLjUwNiAxLjU4M0MxMC4xMzcgMi41NzkgOS41MzcgMyA4LjUgM2EuNS41IDAgMCAwIDAgMWMxLjAzNyAwIDEuNjM3LjQyIDEuOTk0LjkxN0MxMC44NyA1LjQ0IDExIDYuMDggMTEgNi41YS41LjUgMCAwIDAgMSAwYzAtLjQyLjEzLTEuMDYxLjUwNi0xLjU4My4zNTctLjQ5Ni45NTctLjkxNyAxLjk5NC0uOTE3YS41LjUgMCAwIDAgMC0xYy0xLjAzNyAwLTEuNjM3LS40Mi0xLjk5NC0uOTE3QTIuODUyIDIuODUyIDAgMCAxIDEyIC41Wm0uNTg0IDNhMy4xIDMuMSAwIDAgMS0uODktLjgzMyAzLjQwNyAzLjQwNyAwIDAgMS0uMTk0LS4zMDIgMy40MDcgMy40MDcgMCAwIDEtLjE5NC4zMDIgMy4xIDMuMSAwIDAgMS0uODkuODMzIDMuMSAzLjEgMCAwIDEgLjg5LjgzM2MuMDcuMDk5LjEzNi4yLjE5NC4zMDIuMDU5LS4xMDIuMTIzLS4yMDMuMTk0LS4zMDJhMy4xIDMuMSAwIDAgMSAuODktLjgzM1pNNiAzLjVhLjUuNSAwIDAgMC0xIDB2LjAwNmExLjk4NCAxLjk4NCAwIDAgMS0uMDA4LjE3MyA1LjY0IDUuNjQgMCAwIDEtLjA2My41MiA1LjY0NSA1LjY0NSAwIDAgMS0uNTAxIDEuNTc3Yy0uMjgzLjU2Ni0uNyAxLjExNy0xLjMxNSAxLjUyN0MyLjUwMSA3LjcxIDEuNjYzIDggLjUgOGEuNS41IDAgMCAwIDAgMWMxLjE2MyAwIDIuMDAxLjI5IDIuNjEzLjY5Ny42MTYuNDEgMS4wMzIuOTYgMS4zMTUgMS41MjcuMjg0LjU2Ny40MjggMS4xNC41IDEuNTc3YTUuNjQ1IDUuNjQ1IDAgMCAxIC4wNzIuNjkzdi4wMDVhLjUuNSAwIDAgMCAxIC4wMDF2LS4wMDZhMS45OTUgMS45OTUgMCAwIDEgLjAwOC0uMTczIDYuMTQgNi4xNCAwIDAgMSAuMDYzLS41MmMuMDczLS40MzYuMjE3LTEuMDEuNTAxLTEuNTc3LjI4My0uNTY2LjctMS4xMTcgMS4zMTUtMS41MjdDOC40OTkgOS4yOSA5LjMzNyA5IDEwLjUgOWEuNS41IDAgMCAwIDAtMWMtMS4xNjMgMC0yLjAwMS0uMjktMi42MTMtLjY5Ny0uNjE2LS40MS0xLjAzMi0uOTYtMS4zMTUtMS41MjdhNS42NDUgNS42NDUgMCAwIDEtLjUtMS41NzdBNS42NCA1LjY0IDAgMCAxIDYgMy41MDZWMy41Wm0xLjk4OSA1YTQuNzE3IDQuNzE3IDAgMCAxLS42NTctLjM2NWMtLjc5MS0uNTI4LTEuMzEyLTEuMjI3LTEuNjU0LTEuOTExYTUuOTQzIDUuOTQzIDAgMCAxLS4xNzgtLjM5MWMtLjA1My4xMy0uMTEyLjI2LS4xNzguMzktLjM0Mi42ODUtLjg2MyAxLjM4NC0xLjY1NCAxLjkxMmE0LjcxOCA0LjcxOCAwIDAgMS0uNjU3LjM2NWMuMjM2LjEwOC40NTQuMjMuNjU3LjM2NS43OTEuNTI4IDEuMzEyIDEuMjI3IDEuNjU0IDEuOTExLjA2Ni4xMzEuMTI1LjI2Mi4xNzguMzkxLjA1My0uMTMuMTEyLS4yNi4xNzgtLjM5LjM0Mi0uNjg1Ljg2My0xLjM4NCAxLjY1NC0xLjkxMi4yMDMtLjEzNS40MjEtLjI1Ny42NTctLjM2NVpNMTIuNSA5YS41LjUgMCAwIDEgLjUuNWMwIC40Mi4xMyAxLjA2MS41MDYgMS41ODMuMzU3LjQ5Ni45NTcuOTE3IDEuOTk0LjkxN2EuNS41IDAgMCAxIDAgMWMtMS4wMzcgMC0xLjYzNy40Mi0xLjk5NC45MTdBMi44NTIgMi44NTIgMCAwIDAgMTMgMTUuNWEuNS41IDAgMCAxLTEgMGMwLS40Mi0uMTMtMS4wNjEtLjUwNi0xLjU4My0uMzU3LS40OTYtLjk1Ny0uOTE3LTEuOTk0LS45MTdhLjUuNSAwIDAgMSAwLTFjMS4wMzcgMCAxLjYzNy0uNDIgMS45OTQtLjkxN0EyLjg1MiAyLjg1MiAwIDAgMCAxMiA5LjVhLjUuNSAwIDAgMSAuNS0uNVptLjE5NCAyLjY2N2MuMjMuMzIuNTI0LjYwNy44OS44MzNhMy4xIDMuMSAwIDAgMC0uODkuODMzIDMuNDIgMy40MiAwIDAgMC0uMTk0LjMwMiAzLjQyIDMuNDIgMCAwIDAtLjE5NC0uMzAyIDMuMSAzLjEgMCAwIDAtLjg5LS44MzMgMy4xIDMuMSAwIDAgMCAuODktLjgzM2MuMDctLjA5OS4xMzYtLjIuMTk0LS4zMDIuMDU5LjEwMi4xMjMuMjAzLjE5NC4zMDJaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-console::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPGc+CiAgICA8cGF0aCBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xLjE1NzI1MDM4LDEyLjIyNDA0MjQgTDUuNzY4Mjc0MjgsOC4zMjAxOTk3OSBDNS45Nzg2MTMwOCw4LjE0MjEyMDEzIDUuOTc5MTQwOTUsNy44NTgzMjY3OCA1Ljc2ODI3NDI4LDcuNjc5ODAwMjEgTDEuMTU3MjUwMzgsMy43NzU5NTc2MyBDMC45NDc1ODMyMDYsMy41OTg0NDY1OSAwLjk0NzU4MzIwNiwzLjMxMDY0NDMyIDEuMTU3MjUwMzgsMy4xMzMxMzMyOCBDMS4zNjY5MTc1NiwyLjk1NTYyMjI0IDEuNzA2ODU1MjIsMi45NTU2MjIyNCAxLjkxNjUyMjQsMy4xMzMxMzMyOCBMNi41Mjc1NDYyOSw3LjAzNjk3NTg2IEM3LjE1ODI4MzU3LDcuNTcwOTc4NTMgNy4xNTY2ODUwNiw4LjQzMDM3NDgyIDYuNTI3NTQ2MjksOC45NjMwMjQxNCBMMS45MTY1MjI0LDEyLjg2Njg2NjcgQzEuNzA2ODU1MjIsMTMuMDQ0Mzc3OCAxLjM2NjkxNzU2LDEzLjA0NDM3NzggMS4xNTcyNTAzOCwxMi44NjY4NjY3IEMwLjk0NzU4MzIwNiwxMi42ODkzNTU3IDAuOTQ3NTgzMjA2LDEyLjQwMTU1MzQgMS4xNTcyNTAzOCwxMi4yMjQwNDI0IFogTTksMTIgTDE1LDEyIEwxNSwxMyBMOSwxMyBMOSwxMiBaIi8+CiAgPC9nPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }
        
        .connector-inline-highlight.connector-http::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEpIj4KICAgIDxwYXRoIGZpbGw9IiNDNzNBNjMiIGQ9Ik0xNC45NDI1LDEyLjU2Mjg3NSBDMTMuNjE2MjUsMTQuNzkyMzc1IDEyLjM0NTYyNSwxNi45NTEzNzUgMTEuMDQ4NSwxOS4wOTQxMjUgQzEwLjcxNTM3NSwxOS42NDQyNSAxMC41NTA1LDIwLjA5MjM3NSAxMC44MTY2MjUsMjAuNzkxNjI1IEMxMS41NTEzNzUsMjIuNzIzMzc1IDEwLjUxNDg3NSwyNC42MDMyNSA4LjU2Njg3NSwyNS4xMTM1IEM2LjcyOTc1LDI1LjU5NDg3NSA0LjkzOTg3NSwyNC4zODc1IDQuNTc1Mzc1LDIyLjQyMDYyNSBDNC4yNTIzNzUsMjAuNjc5NzUgNS42MDMzNzUsMTguOTczMTI1IDcuNTIyODc1LDE4LjcwMSBDNy42ODM2MjUsMTguNjc4IDcuODQ3ODc1LDE4LjY3NTM3NSA4LjExODEyNSwxOC42NTUxMjUgTDExLjAzNzg3NSwxMy43NTkxMjUgQzkuMjAxNSwxMS45MzMxMjUgOC4xMDg1LDkuNzk4NzUgOC4zNTAzNzUsNy4xNTM3NSBDOC41MjEzNzUsNS4yODQxMjUgOS4yNTY2MjUsMy42NjgzNzUgMTAuNjAwMzc1LDIuMzQ0MTI1IEMxMy4xNzQxMjUsLTAuMTkxODc1IDE3LjEwMDYyNSwtMC42MDI1IDIwLjEzMTEyNSwxLjM0NCBDMjMuMDQxNjI1LDMuMjEzNzUgMjQuMzc0NjI1LDYuODU1NzUgMjMuMjM4Mzc1LDkuOTcyODc1IEMyMi4zODE2MjUsOS43NDA2MjUgMjEuNTE4ODc1LDkuNTA2Mzc1IDIwLjU3MDUsOS4yNDkxMjUgQzIwLjkyNzI1LDcuNTE2IDIwLjY2MzM3NSw1Ljk1OTc1IDE5LjQ5NDUsNC42MjY1IEMxOC43MjIyNSwzLjc0NjI1IDE3LjczMTI1LDMuMjg0ODc1IDE2LjYwNDUsMy4xMTQ4NzUgQzE0LjM0NTUsMi43NzM2MjUgMTIuMTI3NjI1LDQuMjI0ODc1IDExLjQ2OTUsNi40NDIxMjUgQzEwLjcyMjUsOC45NTgzNzUgMTEuODUzMTI1LDExLjAxNCAxNC45NDI1LDEyLjU2MyBMMTQuOTQyNSwxMi41NjI4NzUgWiIvPgogICAgPHBhdGggZmlsbD0iIzRCNEI0QiIgZD0iTTE4LjczMDEyNSw5LjkyNjI1IEMxOS42NjQ1LDExLjU3NDYyNSAyMC42MTMyNSwxMy4yNDc4NzUgMjEuNTUzNSwxNC45MDU3NSBDMjYuMzA2LDEzLjQzNTM3NSAyOS44ODkyNSwxNi4wNjYyNSAzMS4xNzQ3NSwxOC44ODI4NzUgQzMyLjcyNzUsMjIuMjg1MjUgMzEuNjY2LDI2LjMxNSAyOC42MTY2MjUsMjguNDE0MTI1IEMyNS40ODY2MjUsMzAuNTY4ODc1IDIxLjUyODI1LDMwLjIwMDc1IDE4Ljc1NTEyNSwyNy40MzI3NSBDMTkuNDYxODc1LDI2Ljg0MTEyNSAyMC4xNzIxMjUsMjYuMjQ2ODc1IDIwLjkzMSwyNS42MTIgQzIzLjY3LDI3LjM4NiAyNi4wNjU2MjUsMjcuMzAyNSAyNy44NDQxMjUsMjUuMjAxNzUgQzI5LjM2MDc1LDIzLjQwOTYyNSAyOS4zMjc4NzUsMjAuNzM3NSAyNy43NjcyNSwxOC45ODMgQzI1Ljk2NjI1LDE2Ljk1ODM3NSAyMy41NTM4NzUsMTYuODk2NjI1IDIwLjYzNzg3NSwxOC44NDAxMjUgQzE5LjQyODI1LDE2LjY5NDEyNSAxOC4xOTc2MjUsMTQuNTY1MjUgMTcuMDI2MjUsMTIuNDAzNzUgQzE2LjYzMTI1LDExLjY3NTI1IDE2LjE5NTI1LDExLjI1MjUgMTUuMzA1LDExLjA5ODM3NSBDMTMuODE4Mzc1LDEwLjg0MDYyNSAxMi44NTg2MjUsOS41NjQgMTIuODAxLDguMTMzNzUgQzEyLjc0NDM3NSw2LjcxOTI1IDEzLjU3Nzc1LDUuNDQwNjI1IDE0Ljg4MDI1LDQuOTQyNSBDMTYuMTcwNSw0LjQ0ODg3NSAxNy42ODQ2MjUsNC44NDcyNSAxOC41NTI1LDUuOTQ0MjUgQzE5LjI2MTc1LDYuODQwNSAxOS40ODcxMjUsNy44NDkyNSAxOS4xMTM4NzUsOC45NTQ2MjUgQzE5LjAxMDEyNSw5LjI2Mjg3NSAxOC44NzU3NSw5LjU2MTEyNSAxOC43MzAxMjUsOS45MjYzNzUgTDE4LjczMDEyNSw5LjkyNjI1IFoiLz4KICAgIDxwYXRoIGZpbGw9IiM0QTRBNEEiIGQ9Ik0yMC45NjMzNzUsMjMuNDAxMjUgTDE1LjI0MjEyNSwyMy40MDEyNSBDMTQuNjkzNzUsMjUuNjU2NzUgMTMuNTA5MjUsMjcuNDc3NzUgMTEuNDY4Mzc1LDI4LjYzNTc1IEM5Ljg4MTc1LDI5LjUzNTc1IDguMTcxNzUsMjkuODQwODc1IDYuMzUxNzUsMjkuNTQ3IEMzLjAwMDc1LDI5LjAwNjYyNSAwLjI2MDc1LDI1Ljk5IDAuMDE5NSwyMi41OTMyNSBDLTAuMjUzNSwxOC43NDUyNSAyLjM5MTM3NSwxNS4zMjQ4NzUgNS45MTY3NSwxNC41NTY2MjUgQzYuMTYwMTI1LDE1LjQ0MDUgNi40MDYxMjUsMTYuMzMyODc1IDYuNjQ5NSwxNy4yMTQ2MjUgQzMuNDE1LDE4Ljg2NDg3NSAyLjI5NTUsMjAuOTQ0MTI1IDMuMjAwNzUsMjMuNTQ0MTI1IEMzLjk5NzYyNSwyNS44MzIxMjUgNi4yNjEyNSwyNy4wODYyNSA4LjcxOTEyNSwyNi42MDEyNSBDMTEuMjI5MTI1LDI2LjEwNiAxMi40OTQ2MjUsMjQuMDIgMTIuMzQwMTI1LDIwLjY3MjI1IEMxNC43MTk2MjUsMjAuNjcyMjUgMTcuMTAxMTI1LDIwLjY0NzYyNSAxOS40ODA4NzUsMjAuNjg0Mzc1IEMyMC40MTAxMjUsMjAuNjk5IDIxLjEyNzUsMjAuNjAyNjI1IDIxLjgyNzUsMTkuNzgzMzc1IEMyMi45OCwxOC40MzUzNzUgMjUuMTAxMzc1LDE4LjU1NyAyNi4zNDI2MjUsMTkuODMwMTI1IEMyNy42MTExMjUsMjEuMTMxMjUgMjcuNTUwMzc1LDIzLjIyNDc1IDI2LjIwOCwyNC40NzEgQzI0LjkxMjg3NSwyNS42NzM1IDIyLjg2Njc1LDI1LjYwOTI1IDIxLjY1NSwyNC4zMTM1IEMyMS40MDYsMjQuMDQ2NSAyMS4yMDk3NSwyMy43MjkzNzUgMjAuOTYzMzc1LDIzLjQwMTI1IFoiLz4KICA8L2c+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-foreach::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yIDhhNS45OCA1Ljk4IDAgMCAwIDEuNzU3IDQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDE0djFhNi45OCA2Ljk4IDAgMCAxLTQuOTUtMi4wNUE2Ljk4IDYuOTggMCAwIDEgMSA4YzAtMS43OS42ODMtMy41OCAyLjA0OC00Ljk0N2wuMDA0LS4wMDQuMDE5LS4wMkwzLjEgM0gxVjJoNHY0SDRWMy41MjVhNi41MSA2LjUxIDAgMCAwLS4yMi4yMWwtLjAxMy4wMTMtLjAwMy4wMDItLjAwNy4wMDdBNS45OCA1Ljk4IDAgMCAwIDIgOFptMTAuMjQzLTQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDJWMWE2Ljk4IDYuOTggMCAwIDEgNC45NSAyLjA1QTYuOTggNi45OCAwIDAgMSAxNSA4YTYuOTggNi45OCAwIDAgMS0yLjA0NyA0Ljk0N2wtLjAwNS4wMDQtLjAxOC4wMi0uMDMuMDI5SDE1djFoLTR2LTRoMXYyLjQ3NWE2Ljc0NCA2Ljc0NCAwIDAgMCAuMjItLjIxbC4wMTMtLjAxMy4wMDMtLjAwMi4wMDctLjAwN0E1Ljk4IDUuOTggMCAwIDAgMTQgOGE1Ljk4IDUuOTggMCAwIDAtMS43NTctNC4yNDNaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-if::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSwxMC4wMzc3MTg4IEM1LjYzNTI1ODUyLDkuMzg5NDQzNzcgNi41MjA2NTU5MSw4Ljk4NzIxMDE2IDcuNSw4Ljk4NzIxMDE2IEw5LjUsOC45ODcyMTAxNiBDMTAuNzMwNzc2NSw4Ljk4NzIxMDE2IDExLjc1MzgyNCw4LjA5NzgxNjE1IDExLjk2MTUwMTMsNi45MjY2NjkxNiBDMTEuMTE4NDg5Miw2LjY5MTU0NjExIDEwLjUsNS45MTgwMDA5OSAxMC41LDUgQzEwLjUsMy44OTU0MzA1IDExLjM5NTQzMDUsMyAxMi41LDMgQzEzLjYwNDU2OTUsMyAxNC41LDMuODk1NDMwNSAxNC41LDUgQzE0LjUsNS45NDI1NDI2MiAxMy44NDc5OTk3LDYuNzMyODAyNDEgMTIuOTcwNDE0Miw2Ljk0NDM2NDM4IEMxMi43NDY0MzcxLDguNjYxMzUwMDIgMTEuMjc4MDU0Miw5Ljk4NzIxMDE2IDkuNSw5Ljk4NzIxMDE2IEw3LjUsOS45ODcyMTAxNiBDNi4yNjA2ODU5Miw5Ljk4NzIxMDE2IDUuMjMxOTkyODYsMTAuODg4OTg1OSA1LjAzNDI5NDgxLDEyLjA3MjE2MzMgQzUuODc5NDUzODgsMTIuMzA1ODgzOCA2LjUsMTMuMDgwNDczNyA2LjUsMTQgQzYuNSwxNS4xMDQ1Njk1IDUuNjA0NTY5NSwxNiA0LjUsMTYgQzMuMzk1NDMwNSwxNiAyLjUsMTUuMTA0NTY5NSAyLjUsMTQgQzIuNSwxMy4wNjgwODAzIDMuMTM3Mzg2MzksMTIuMjg1MDMwMSA0LDEyLjA2MzAwODcgTDQsMy45MzY5OTEyNiBDMy4xMzczODYzOSwzLjcxNDk2OTg2IDIuNSwyLjkzMTkxOTcxIDIuNSwyIEMyLjUsMC44OTU0MzA1IDMuMzk1NDMwNSwwIDQuNSwwIEM1LjYwNDU2OTUsMCA2LjUsMC44OTU0MzA1IDYuNSwyIEM2LjUsMi45MzE5MTk3MSA1Ljg2MjYxMzYxLDMuNzE0OTY5ODYgNSwzLjkzNjk5MTI2IEw1LDEwLjAzNzcxODggWiBNNC41LDMgQzUuMDUyMjg0NzUsMyA1LjUsMi41NTIyODQ3NSA1LjUsMiBDNS41LDEuNDQ3NzE1MjUgNS4wNTIyODQ3NSwxIDQuNSwxIEMzLjk0NzcxNTI1LDEgMy41LDEuNDQ3NzE1MjUgMy41LDIgQzMuNSwyLjU1MjI4NDc1IDMuOTQ3NzE1MjUsMyA0LjUsMyBaIE00LjUsMTUgQzUuMDUyMjg0NzUsMTUgNS41LDE0LjU1MjI4NDcgNS41LDE0IEM1LjUsMTMuNDQ3NzE1MyA1LjA1MjI4NDc1LDEzIDQuNSwxMyBDMy45NDc3MTUyNSwxMyAzLjUsMTMuNDQ3NzE1MyAzLjUsMTQgQzMuNSwxNC41NTIyODQ3IDMuOTQ3NzE1MjUsMTUgNC41LDE1IFogTTEyLjUsNiBDMTMuMDUyMjg0Nyw2IDEzLjUsNS41NTIyODQ3NSAxMy41LDUgQzEzLjUsNC40NDc3MTUyNSAxMy4wNTIyODQ3LDQgMTIuNSw0IEMxMS45NDc3MTUzLDQgMTEuNSw0LjQ0NzcxNTI1IDExLjUsNSBDMTEuNSw1LjU1MjI4NDc1IDExLjk0NzcxNTMsNiAxMi41LDYgWiIvPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-parallel::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSAyYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXptNiAwYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXoiIC8+Cjwvc3ZnPg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-merge::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMC4zNTQgOC4zNTQgMTQuMjA3IDQuNSAxMC4zNTMuNjQ2bC0uNzA3LjcwOEwxMi4yOTMgNEgydjFoMTAuMjkzTDkuNjQ2IDcuNjQ2bC43MDcuNzA4Wm0tNC43MDcgN0wxLjc5MyAxMS41bDMuODU0LTMuODU0LjcwNy43MDhMMy43MDcgMTFIMTR2MUgzLjcwN2wyLjY0NyAyLjY0Ni0uNzA3LjcwOFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .connector-inline-highlight.connector-wait::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        /* Trigger type decorations */
        .trigger-inline-highlight {
          background-color: rgba(0, 191, 179, 0.12) !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          box-shadow: 0 1px 2px rgba(0, 191, 179, 0.15) !important;
        }
        
        .trigger-inline-highlight::after {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }

        .trigger-inline-highlight.trigger-alert {
          background-color: rgba(240, 78, 152, 0.12) !important;
          box-shadow: 0 1px 2px rgba(240, 78, 152, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-scheduled {
          background-color: rgba(255, 193, 7, 0.12) !important;
          box-shadow: 0 1px 2px rgba(255, 193, 7, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-manual {
          background-color: rgba(108, 117, 125, 0.12) !important;
          box-shadow: 0 1px 2px rgba(108, 117, 125, 0.2) !important;
        }

        .trigger-inline-highlight.trigger-alert::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik04LjIyIDEuNzU0YS4yNS4yNSAwIDAgMC0uNDQgMEwxLjY5OCAxMy4xMzJhLjI1LjI1IDAgMCAwIC4yMi4zNjhoMTIuMTY0YS4yNS4yNSAwIDAgMCAuMjItLjM2OEw4LjIyIDEuNzU0Wk03LjI1IDVhLjc1Ljc1IDAgMCAxIDEuNSAwdjIuNWEuNzUuNzUgMCAwIDEtMS41IDBWNTJNOCA5LjVhMSAxIDAgMSAwIDAgMiAxIDEgMCAwIDAgMC0yWiIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRjA0RTk4Ii8+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .trigger-inline-highlight.trigger-scheduled::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==");
          background-size: contain;
          background-repeat: no-repeat;
        }

        .trigger-inline-highlight.trigger-manual::after {
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zLjI5MyA5LjI5MyA0IDEwbC0xIDRoMTBsLTEtNCAuNzA3LS43MDdhMSAxIDAgMCAxIC4yNjMuNDY0bDEgNEExIDEgMCAwIDEgMTMgMTVIM2ExIDEgMCAwIDEtLjk3LTEuMjQybDEtNGExIDEgMCAwIDEgLjI2My0uNDY1Wk04IDljMyAwIDQgMSA0IDEgLjcwNy0uNzA3LjcwNi0uNzA4LjcwNi0uNzA4bC0uMDAxLS4wMDEtLjAwMi0uMDAyLS4wMDUtLjAwNS0uMDEtLjAxYTEuNzk4IDEuNzk4IDAgMCAwLS4xMDEtLjA4OSAyLjkwNyAyLjkwNyAwIDAgMC0uMjM1LS4xNzMgNC42NiA0LjY2IDAgMCAwLS44NTYtLjQ0IDcuMTEgNy4xMSAwIDAgMC0xLjEzNi0uMzQyIDQgNCAwIDEgMC00LjcyIDAgNy4xMSA3LjExIDAgMCAwLTEuMTM2LjM0MiA0LjY2IDQuNjYgMCAwIDAtLjg1Ni40NCAyLjkwOSAyLjkwOSAwIDAgMC0uMzM1LjI2MmwtLjAxMS4wMS0uMDA1LjAwNS0uMDAyLjAwMmgtLjAwMVMzLjI5MyA5LjI5NCA0IDEwYzAgMCAxLTEgNC0xWm0wLTFhMyAzIDAgMSAwIDAtNiAzIDMgMCAwIDAgMCA2WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+Cjwvc3ZnPgo=");
          background-size: contain;
          background-repeat: no-repeat;
        }

        /* After content icons */
        .connector-decoration {
          margin-left: 4px;
          opacity: 0.7;
          font-size: 14px;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup: remove the style when component unmounts
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [euiTheme]);

  const editorOptions = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      readOnly,
      minimap: { enabled: false },
      automaticLayout: true,
      lineNumbers: 'on',
      glyphMargin: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
      lineNumbersMinChars: 2,
      insertSpaces: true,
      fontSize: 14,
      renderWhitespace: 'all',
      wordWrap: 'on',
      wordWrapColumn: 80,
      wrappingIndent: 'indent',
      theme: 'workflows-subdued',
      padding: {
        top: 24,
        bottom: 16,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showSnippets: true,
        triggerCharacters: true,
        minWordLength: 1, // Show suggestions after 1 character
        filterGraceful: true, // Better filtering
        localityBonus: true, // Prioritize matches near cursor
      },
      hover: {
        enabled: true,
        delay: 300,
        sticky: true,
        above: false, // Force hover below cursor to avoid clipping
      },
      formatOnType: true,
    }),
    [readOnly]
  );

  const styles = useMemoCss(componentStyles);

  // Clean up the monaco model and editor on unmount
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
      // Dispose of Monaco providers
      disposablesRef.current.forEach((disposable) => disposable.dispose());
      disposablesRef.current = [];

      // Dispose of decorations and actions provider
      unifiedProvidersRef.current?.actions?.dispose();
      unifiedProvidersRef.current?.stepExecution?.dispose();
      unifiedProvidersRef.current = null;

      editor?.dispose();
    };
  }, []);

  useEffect(() => {
    // Monkey patching to set the initial markers
    // https://github.com/suren-atoyan/monaco-react/issues/70#issuecomment-760389748
    const setModelMarkers = monaco.editor.setModelMarkers;
    monaco.editor.setModelMarkers = function (model, owner, markers) {
      setModelMarkers.call(monaco.editor, model, owner, markers);
      if (editorRef.current) {
        handleMarkersChanged(editorRef.current, model.uri, markers, owner);
      }
    };

    return () => {
      // Reset the monaco.editor.setModelMarkers to the original function
      monaco.editor.setModelMarkers = setModelMarkers;
    };
  }, [handleMarkersChanged]);

  return (
    <div css={styles.container}>
      <UnsavedChangesPrompt hasUnsavedChanges={hasChanges} shouldPromptOnNavigation={true} />
      {/* Floating Elasticsearch step actions */}
      {unifiedProvidersRef.current?.actions && (
        <EuiFlexGroup
          className="elasticsearch-step-actions"
          gutterSize="xs"
          responsive={false}
          style={editorActionsCss}
          justifyContent="center"
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            {http && notifications && (
              <ElasticsearchStepActions
                actionsProvider={unifiedProvidersRef.current?.actions}
                http={http}
                notifications={notifications as any}
                esHost={esHost}
                kibanaHost={kibanaHost}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div
        css={{ position: 'absolute', top: euiTheme.size.xxs, right: euiTheme.size.m, zIndex: 10 }}
      >
        {hasChanges ? (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              color: euiTheme.colors.accent,
              cursor: 'pointer',
              borderRadius: euiTheme.border.radius.small,
              '&:hover': {
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              },
            }}
            onClick={() => setShowDiffHighlight(!showDiffHighlight)}
            role="button"
            tabIndex={0}
            aria-pressed={showDiffHighlight}
            aria-label={
              showDiffHighlight
                ? i18n.translate('workflows.workflowDetail.yamlEditor.hideDiff', {
                    defaultMessage: 'Hide diff highlighting',
                  })
                : i18n.translate('workflows.workflowDetail.yamlEditor.showDiff', {
                    defaultMessage: 'Show diff highlighting',
                  })
            }
            onKeyDown={() => {}}
            title={
              showDiffHighlight ? 'Hide diff highlighting' : 'Click to highlight changed lines'
            }
          >
            <EuiIcon type="dot" />
            <span>
              <FormattedMessage
                id="workflows.workflowDetail.yamlEditor.unsavedChanges"
                defaultMessage="Unsaved changes"
              />
            </span>
          </div>
        ) : (
          <div
            css={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              color: euiTheme.colors.textSubdued,
            }}
          >
            <EuiIcon type="check" />
            <span>
              <FormattedMessage
                id="workflows.workflowDetail.yamlEditor.saved"
                defaultMessage="Saved"
              />{' '}
              {lastUpdatedAt ? <FormattedRelative value={lastUpdatedAt} /> : null}
            </span>
          </div>
        )}
      </div>
      <div css={styles.editorContainer}>
        <YamlEditor
          editorDidMount={handleEditorDidMount}
          onChange={handleChange}
          options={editorOptions}
          schemas={schemas}
          suggestionProvider={completionProvider}
          {...props}
        />
      </div>
      <div css={styles.validationErrorsContainer}>
        <WorkflowYAMLValidationErrors
          isMounted={isEditorMounted}
          error={errorValidating}
          validationErrors={validationErrors}
          onErrorClick={(error) => {
            if (!editorRef.current) {
              return;
            }
            navigateToErrorPosition(editorRef.current, error.lineNumber, error.column);
          }}
        />
      </div>
    </div>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      minHeight: 0,
      // css classes for the monaco editor
      '.template-variable-valid': {
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
        borderRadius: '2px',
      },
      '.template-variable-error': {
        backgroundColor: euiTheme.colors.vis.euiColorVisWarning1,
        color: euiTheme.colors.severity.danger,
        borderRadius: '2px',
      },
      '.step-highlight': {
        backgroundColor: euiTheme.colors.backgroundBaseAccent,
        borderRadius: '2px',
      },
      '.dimmed': {
        opacity: 0.5,
      },
      '.step-execution-skipped': {
        backgroundColor: euiTheme.colors.backgroundBaseFormsControlDisabled,
      },
      '.step-execution-waiting_for_input': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
      },
      '.step-execution-running': {
        backgroundColor: euiTheme.colors.backgroundLightPrimary,
      },
      '.step-execution-completed': {
        backgroundColor: euiTheme.colors.backgroundLightSuccess,
      },
      '.step-execution-failed': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.step-execution-skipped-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledText,
          borderRadius: '50%',
        },
      },
      // Enhanced Monaco hover styling for better readability - EXCLUDE glyph and contrib widgets
      // Only target our custom hover widgets, not Monaco's internal ones (especially glyph hovers)
      '&, & .monaco-editor, & .monaco-hover:not([class*="contrib"]):not([class*="glyph"]), & .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"])':
        {
          '--hover-width': '600px',
          '--hover-min-width': '500px',
          '--hover-max-width': '800px',
          '--hover-max-height': '600px',
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]), .monaco-hover:not([class*="contrib"]):not([class*="glyph"])':
        {
          width: '600px',
          minWidth: '500px',
          maxWidth: '800px',
          maxHeight: '400px',
          fontSize: '13px',
          zIndex: 999, // Lower than Monaco's internal widgets
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .monaco-hover-content':
        {
          width: '100%',
          minWidth: '500px',
          maxWidth: '800px',
          padding: '12px 16px',
        },
      '.monaco-editor .monaco-editor-hover:not([class*="contrib"]):not([class*="glyph"]) .hover-contents':
        {
          width: '100%',
          minWidth: '500px',
          maxWidth: '800px',
        },
      // Ensure Monaco's internal glyph hover widgets work properly
      '& [class*="modesGlyphHoverWidget"], & [class*="glyph"][class*="hover"]': {
        display: 'block',
        visibility: 'visible',
      },
      '.monaco-editor .monaco-editor-hover .markdown-docs': {
        width: '100%',
        minWidth: '500px',
        maxWidth: '800px',
        flex: '1',
        overflowY: 'auto',
        overflowX: 'hidden',
      },
      '.monaco-editor .monaco-editor-hover h2': {
        fontSize: '16px !important',
        fontWeight: 600,
        marginBottom: '8px !important',
        color: euiTheme.colors.primaryText,
      },
      '.monaco-editor .monaco-editor-hover h3': {
        fontSize: '14px !important',
        fontWeight: 600,
        marginTop: '16px !important',
        marginBottom: '8px !important',
        color: euiTheme.colors.primaryText,
      },
      '.monaco-editor .monaco-editor-hover a': {
        color: euiTheme.colors.primary,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      },
      '.monaco-editor .monaco-editor-hover code': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        padding: '2px 4px',
        borderRadius: '3px',
        fontSize: '12px',
      },
      '.monaco-editor .monaco-editor-hover pre': {
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        overflow: 'auto',
        maxHeight: '120px',
      },
      '.step-execution-waiting_for_input-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledWarning,
          borderRadius: '50%',
        },
      },
      '.step-execution-running-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.backgroundFilledPrimary,
          borderRadius: '50%',
        },
      },
      '.step-execution-completed-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.vis.euiColorVis0,
          borderRadius: '50%',
        },
      },
      '.step-execution-failed-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.danger,
          borderRadius: '50%',
        },
      },
      '.alert-trigger-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.warning,
          borderRadius: '50%',
        },
      },
      '.alert-trigger-highlight': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
      },
      '.duplicate-step-name-error': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
      },
      '.duplicate-step-name-error-margin': {
        backgroundColor: euiTheme.colors.backgroundLightDanger,
        // Use a solid background to completely cover the line numbers
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: euiTheme.colors.backgroundLightDanger,
          zIndex: 1000,
        },
        // Make the text invisible as backup
        color: 'transparent',
        textShadow: 'none',
        fontSize: 0,
      },
      '.elasticsearch-step-glyph': {
        '&:before': {
          content: '""',
          display: 'block',
          width: '12px',
          height: '12px',
          backgroundColor: euiTheme.colors.vis.euiColorVis1,
          borderRadius: '50%',
        },
      },
      '.elasticsearch-step-type-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.elasticsearch-step-block-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.08)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.elasticsearch-step-background': {
        backgroundColor: 'rgba(0, 120, 212, 0.08)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.workflow-step-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.1)',
        borderLeft: `3px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      '.workflow-step-line-highlight': {
        backgroundColor: 'rgba(0, 120, 212, 0.05)',
        borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
      },
      // Dev Console-style step highlighting (block border approach)
      '.workflow-step-selected-single': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        border: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRadius: '3px',
        boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
        position: 'relative', // Enable relative positioning for action buttons
      },
      '.workflow-step-selected-first': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderTop: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRight: `1px solid #0078d4`, // Explicit blue color
        borderTopLeftRadius: '3px',
        borderTopRightRadius: '3px',
        position: 'relative', // Enable relative positioning for action buttons
      },
      '.workflow-step-selected-middle': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderLeft: `1px solid #0078d4`, // Left border to connect with first/last
        borderRight: `1px solid #0078d4`, // Right border to connect with first/last
      },
      '.workflow-step-selected-last': {
        backgroundColor: 'rgba(0, 120, 212, 0.02)',
        borderBottom: `1px solid #0078d4`, // Explicit blue color
        borderLeft: `1px solid #0078d4`, // Explicit blue color
        borderRight: `1px solid #0078d4`, // Explicit blue color
        borderBottomLeftRadius: '3px',
        borderBottomRightRadius: '3px',
        boxShadow: `0 1px 3px rgba(0, 120, 212, 0.1)`,
      },

      // Custom icons for Monaco autocomplete (SUGGESTIONS)
      // Slack
      '.codicon-symbol-event:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNFMDFFNUEiIGQ9Ik02LjgxMjkwMzIzIDMuNDA2NDUxNjFDNi44MTI5MDMyMyA1LjIzODcwOTY4IDUuMzE2MTI5MDMgNi43MzU0ODM4NyAzLjQ4Mzg3MDk3IDYuNzM1NDgzODcgMS42NTE2MTI5IDYuNzM1NDgzODcuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSAzLjQwNjQ1MTYxLjE1NDgzODcxIDEuNTc0MTkzNTUgMS42NTE2MTI5LjA3NzQxOTM1NDggMy40ODM4NzA5Ny4wNzc0MTkzNTQ4TDYuODEyOTAzMjMuMDc3NDE5MzU0OCA2LjgxMjkwMzIzIDMuNDA2NDUxNjF6TTguNDkwMzIyNTggMy40MDY0NTE2MUM4LjQ5MDMyMjU4IDEuNTc0MTkzNTUgOS45ODcwOTY3Ny4wNzc0MTkzNTQ4IDExLjgxOTM1NDguMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEgMy40MDY0NTE2MUwxNS4xNDgzODcxIDExLjc0MTkzNTVDMTUuMTQ4Mzg3MSAxMy41NzQxOTM1IDEzLjY1MTYxMjkgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgOS45ODcwOTY3NyAxNS4wNzA5Njc3IDguNDkwMzIyNTggMTMuNTc0MTkzNSA4LjQ5MDMyMjU4IDExLjc0MTkzNTVMOC40OTAzMjI1OCAzLjQwNjQ1MTYxeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxNi43NzQpIi8+CiAgICA8cGF0aCBmaWxsPSIjMzZDNUYwIiBkPSJNMTEuODE5MzU0OCA2LjgxMjkwMzIzQzkuOTg3MDk2NzcgNi44MTI5MDMyMyA4LjQ5MDMyMjU4IDUuMzE2MTI5MDMgOC40OTAzMjI1OCAzLjQ4Mzg3MDk3IDguNDkwMzIyNTggMS42NTE2MTI5IDkuOTg3MDk2NzcuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSAxMy42NTE2MTI5LjE1NDgzODcxIDE1LjE0ODM4NzEgMS42NTE2MTI5IDE1LjE0ODM4NzEgMy40ODM4NzA5N0wxNS4xNDgzODcxIDYuODEyOTAzMjMgMTEuODE5MzU0OCA2LjgxMjkwMzIzek0xMS44MTkzNTQ4IDguNDkwMzIyNThDMTMuNjUxNjEyOSA4LjQ5MDMyMjU4IDE1LjE0ODM4NzEgOS45ODcwOTY3NyAxNS4xNDgzODcxIDExLjgxOTM1NDggMTUuMTQ4Mzg3MSAxMy42NTE2MTI5IDEzLjY1MTYxMjkgMTUuMTQ4Mzg3MSAxMS44MTkzNTQ4IDE1LjE0ODM4NzFMMy40ODM4NzA5NyAxNS4xNDgzODcxQzEuNjUxNjEyOSAxNS4xNDgzODcxLjE1NDgzODcxIDEzLjY1MTYxMjkuMTU0ODM4NzEgMTEuODE5MzU0OC4xNTQ4Mzg3MSA5Ljk4NzA5Njc3IDEuNjUxNjEyOSA4LjQ5MDMyMjU4IDMuNDgzODcwOTcgOC40OTAzMjI1OEwxMS44MTkzNTQ4IDguNDkwMzIyNTh6Ii8+CiAgICA8cGF0aCBmaWxsPSIjMkVCNjdEIiBkPSJNOC40MTI5MDMyMyAxMS44MTkzNTQ4QzguNDEyOTAzMjMgOS45ODcwOTY3NyA5LjkwOTY3NzQyIDguNDkwMzIyNTggMTEuNzQxOTM1NSA4LjQ5MDMyMjU4IDEzLjU3NDE5MzUgOC40OTAzMjI1OCAxNS4wNzA5Njc3IDkuOTg3MDk2NzcgMTUuMDcwOTY3NyAxMS44MTkzNTQ4IDE1LjA3MDk2NzcgMTMuNjUxNjEyOSAxMy41NzQxOTM1IDE1LjE0ODM4NzEgMTEuNzQxOTM1NSAxNS4xNDgzODcxTDguNDEyOTAzMjMgMTUuMTQ4Mzg3MSA4LjQxMjkwMzIzIDExLjgxOTM1NDh6TTYuNzM1NDgzODcgMTEuODE5MzU0OEM2LjczNTQ4Mzg3IDEzLjY1MTYxMjkgNS4yMzg3MDk2OCAxNS4xNDgzODcxIDMuNDA2NDUxNjEgMTUuMTQ4Mzg3MSAxLjU3NDE5MzU1IDE1LjE0ODM4NzEuMDc3NDE5MzU0OCAxMy42NTE2MTI5LjA3NzQxOTM1NDggMTEuODE5MzU0OEwuMDc3NDE5MzU0OCAzLjQ4Mzg3MDk3Qy4wNzc0MTkzNTQ4IDEuNjUxNjEyOSAxLjU3NDE5MzU1LjE1NDgzODcxIDMuNDA2NDUxNjEuMTU0ODM4NzEgNS4yMzg3MDk2OC4xNTQ4Mzg3MSA2LjczNTQ4Mzg3IDEuNjUxNjEyOSA2LjczNTQ4Mzg3IDMuNDgzODcwOTdMNi43MzU0ODM4NyAxMS44MTkzNTQ4eiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYuNzc0KSIvPgogICAgPHBhdGggZmlsbD0iI0VDQjIyRSIgZD0iTTMuNDA2NDUxNjEgOC40MTI5MDMyM0M1LjIzODcwOTY4IDguNDEyOTAzMjMgNi43MzU0ODM4NyA5LjkwOTY3NzQyIDYuNzM1NDgzODcgMTEuNzQxOTM1NSA2LjczNTQ4Mzg3IDEzLjU3NDE5MzUgNS4yMzg3MDk2OCAxNS4wNzA5Njc3IDMuNDA2NDUxNjEgMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcuMDc3NDE5MzU0OCAxMy41NzQxOTM1LjA3NzQxOTM1NDggMTEuNzQxOTM1NUwuMDc3NDE5MzU0OCA4LjQxMjkwMzIzIDMuNDA2NDUxNjEgOC40MTI5MDMyM3pNMy40MDY0NTE2MSA2LjczNTQ4Mzg3QzEuNTc0MTkzNTUgNi43MzU0ODM4Ny4wNzc0MTkzNTQ4IDUuMjM4NzA5NjguMDc3NDE5MzU0OCAzLjQwNjQ1MTYxLjA3NzQxOTM1NDggMS41NzQxOTM1NSAxLjU3NDE5MzU1LjA3NzQxOTM1NDggMy40MDY0NTE2MS4wNzc0MTkzNTQ4TDExLjc0MTkzNTUuMDc3NDE5MzU0OEMxMy41NzQxOTM1LjA3NzQxOTM1NDggMTUuMDcwOTY3NyAxLjU3NDE5MzU1IDE1LjA3MDk2NzcgMy40MDY0NTE2MSAxNS4wNzA5Njc3IDUuMjM4NzA5NjggMTMuNTc0MTkzNSA2LjczNTQ4Mzg3IDExLjc0MTkzNTUgNi43MzU0ODM4N0wzLjQwNjQ1MTYxIDYuNzM1NDgzODd6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNi43NzQgMTYuNzc0KSIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Elasticsearch
      '.codicon-symbol-struct:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyBkYXRhLXR5cGU9ImxvZ29FbGFzdGljIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDMyIDMyIj4KPHBhdGggZD0iTTI3LjU2NDggMTEuMjQyNUMzMi42NjU0IDEzLjE4MiAzMi40MzczIDIwLjYzNzggMjcuMzE5NyAyMi4zNjk0TDI3LjE1NzYgMjIuNDI0MUwyNi45OTA2IDIyLjM4NTFMMjEuNzEwMyAyMS4xNDY4TDIxLjQ0MjcgMjEuMDg0M0wyMS4zMTU4IDIwLjg0MDFMMTkuOTE1NCAxOC4xNDk3TDE5LjY5ODYgMTcuNzMyN0wyMC4wNTExIDE3LjQyMjJMMjYuOTU1NCAxMS4zNTI4TDI3LjIyNjkgMTEuMTEzNkwyNy41NjQ4IDExLjI0MjVaIiBmaWxsPSIjMEI2NEREIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNMjIuMDQ3MiAyMS4yMzlMMjYuODQ3IDIyLjM2NEwyNy4xNjI1IDIyLjQzODJMMjcuMjczOCAyMi43NDE5TDI3LjMzOTIgMjIuOTMyNEMyNy45NjE1IDI0Ljg5NjIgMjcuMDc5NyAyNi43MTE3IDI1LjY4NjkgMjcuNzI5MkMyNC4yNTI4IDI4Ljc3NjcgMjIuMTc3NSAyOS4wNDg4IDIwLjUwNTIgMjcuNzUwN0wyMC4yMTUyIDI3LjUyNjFMMjAuMjgzNiAyNy4xNjQ4TDIxLjMyMDcgMjEuNzEwN0wyMS40Mzc5IDIxLjA5NjRMMjIuMDQ3MiAyMS4yMzlaIiBmaWxsPSIjOUFEQzMwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNS4wMTA3NCA5LjYyOTk3TDEwLjI3NzMgMTAuODg0OUwxMC41NTk2IDEwLjk1MjJMMTAuNjgxNiAxMS4yMTU5TDExLjkxNyAxMy44NjUzTDEyLjEwMzUgMTQuMjY2N0wxMS43NzY0IDE0LjU2MzZMNS4wNDI5NyAyMC42NjQyTDQuNzcwNTEgMjAuOTEyMkw0LjQyNTc4IDIwLjc4MDRDMS45Mzg5IDE5LjgzMDMgMC43MjA0MDcgMTcuNDU1OCAwLjc1MTk1MyAxNS4xNTM0QzAuNzgzNjg2IDEyLjg0NTMgMi4wNzMwNSAxMC41MDk0IDQuNjgzNTkgOS42NDQ2Mkw0Ljg0NTcgOS41OTA5MUw1LjAxMDc0IDkuNjI5OTdaIiBmaWxsPSIjMUJBOUY1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuMiIvPgo8cGF0aCBkPSJNNi4yODEwMSA0LjMxOTgyQzcuNjk3MjMgMy4yMzk0IDkuNzYxMzUgMi45MzM0IDExLjUwMjcgNC4yNTE0NkwxMS43OTk2IDQuNDc3MDVMMTEuNzI5MiA0Ljg0MzI2TDEwLjY3NzUgMTAuMzE2OUwxMC41NTkzIDEwLjkzMjFMOS45NDk5NSAxMC43ODc2TDUuMTUwMTUgOS42NTA4OEw0LjgzMzc0IDkuNTc1NjhMNC43MjMzOSA5LjI3MDAyQzQuMDE1MDcgNy4zMDI5NSA0Ljg3MjYzIDUuMzk0MjkgNi4yODEwMSA0LjMxOTgyWiIgZmlsbD0iI0YwNEU5OCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPHBhdGggZD0iTTEyLjQ2NjEgMTQuNDMzMUwxOS40OTYzIDE3LjY0NEwxOS42ODM4IDE3LjczTDE5Ljc3ODYgMTcuOTEyNkwyMS4zMzQyIDIwLjg5NzlMMjEuNDI5OSAyMS4wODI1TDIxLjM5MDkgMjEuMjg3NkwyMC4yMjQ5IDI3LjM4OTJMMjAuMjAxNCAyNy41MTEyTDIwLjEzMzEgMjcuNjEzOEMxNy40NTM0IDMxLjU3MiAxMy4yMzA1IDMyLjMyNDUgOS44NjQ1IDMwLjg3MzVDNi41MDkzMiAyOS40MjcyIDQuMDMwNyAyNS44MDQ0IDQuNzM5NSAyMS4xMzgyTDQuNzcxNzMgMjAuOTI3Mkw0LjkyOTkzIDIwLjc4MzdMMTEuODEzNyAxNC41MzQ3TDEyLjEwNjcgMTQuMjY5TDEyLjQ2NjEgMTQuNDMzMVoiIGZpbGw9IiMwMkJDQjciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMS4yIi8+CjxwYXRoIGQ9Ik0xMS44OTIzIDQuNDEwMjJDMTQuNDM4MSAwLjY3NjQyNiAxOC43NDEgMC4xMDUzMDMgMjIuMTMzNSAxLjUzOTEyQzI1LjUyNjMgMi45NzMwMiAyOC4xMjMxIDYuNDU5NzkgMjcuMjM2MSAxMC45MDI0TDI3LjE5NyAxMS4xMDE2TDI3LjA0MzcgMTEuMjM1NEwxOS45NzgzIDE3LjQ0ODNMMTkuNjg1MyAxNy43MDYxTDE5LjMzMTggMTcuNTQzTDEyLjMyOTggMTQuMzMyMUwxMi4xMjg3IDE0LjI0MDNMMTIuMDM0OSAxNC4wMzkxTDEwLjY1NSAxMS4wNTE4TDEwLjU3NCAxMC44NzUxTDEwLjYxMTEgMTAuNjg0NkwxMS43OTk2IDQuNjMyODdMMTEuODIzIDQuNTExNzhMMTEuODkyMyA0LjQxMDIyWiIgZmlsbD0iI0ZFQzUxNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KPC9zdmc+")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // Kibana
      '.codicon-symbol-module:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQpIj4KICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMjguNzg5IDI0LjkzNSAuMDE3Ii8+CiAgICA8cGF0aCBjbGFzcz0iZXVpSWNvbl9fZmlsbE5lZ2F0aXZlIiBkPSJNMCwxMiBMMCwyOC43ODkgTDExLjkwNiwxNS4wNTEgQzguMzY4LDEzLjExNSA0LjMxNywxMiAwLDEyIi8+CiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTQuNDc4NSwxNi42NjQgTDIuMjY3NSwzMC43NTQgTDEuMTk0NSwzMS45OTEgTDI0LjM4NjUsMzEuOTkxIEMyMy4xMzQ1LDI1LjY5OSAxOS41MDM1LDIwLjI3MiAxNC40Nzg1LDE2LjY2NCIvPgogIDwvZz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },
      // HTTP
      '.codicon-symbol-reference:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEpIj4KICAgIDxwYXRoIGZpbGw9IiNDNzNBNjMiIGQ9Ik0xNC45NDI1LDEyLjU2Mjg3NSBDMTMuNjE2MjUsMTQuNzkyMzc1IDEyLjM0NTYyNSwxNi45NTEzNzUgMTEuMDQ4NSwxOS4wOTQxMjUgQzEwLjcxNTM3NSwxOS42NDQyNSAxMC41NTA1LDIwLjA5MjM3NSAxMC44MTY2MjUsMjAuNzkxNjI1IEMxMS41NTEzNzUsMjIuNzIzMzc1IDEwLjUxNDg3NSwyNC42MDMyNSA4LjU2Njg3NSwyNS4xMTM1IEM2LjcyOTc1LDI1LjU5NDg3NSA0LjkzOTg3NSwyNC4zODc1IDQuNTc1Mzc1LDIyLjQyMDYyNSBDNC4yNTIzNzUsMjAuNjc5NzUgNS42MDMzNzUsMTguOTczMTI1IDcuNTIyODc1LDE4LjcwMSBDNy42ODM2MjUsMTguNjc4IDcuODQ3ODc1LDE4LjY3NTM3NSA4LjExODEyNSwxOC42NTUxMjUgTDExLjAzNzg3NSwxMy43NTkxMjUgQzkuMjAxNSwxMS45MzMxMjUgOC4xMDg1LDkuNzk4NzUgOC4zNTAzNzUsNy4xNTM3NSBDOC41MjEzNzUsNS4yODQxMjUgOS4yNTY2MjUsMy42NjgzNzUgMTAuNjAwMzc1LDIuMzQ0MTI1IEMxMy4xNzQxMjUsLTAuMTkxODc1IDE3LjEwMDYyNSwtMC42MDI1IDIwLjEzMTEyNSwxLjM0NCBDMjMuMDQxNjI1LDMuMjEzNzUgMjQuMzc0NjI1LDYuODU1NzUgMjMuMjM4Mzc1LDkuOTcyODc1IEMyMi4zODE2MjUsOS43NDA2MjUgMjEuNTE4ODc1LDkuNTA2Mzc1IDIwLjU3MDUsOS4yNDkxMjUgQzIwLjkyNzI1LDcuNTE2IDIwLjY2MzM3NSw1Ljk1OTc1IDE5LjQ5NDUsNC42MjY1IEMxOC43MjIyNSwzLjc0NjI1IDE3LjczMTI1LDMuMjg0ODc1IDE2LjYwNDUsMy4xMTQ4NzUgQzE0LjM0NTUsMi43NzM2MjUgMTIuMTI3NjI1LDQuMjI0ODc1IDExLjQ2OTUsNi40NDIxMjUgQzEwLjcyMjUsOC45NTgzNzUgMTEuODUzMTI1LDExLjAxNCAxNC45NDI1LDEyLjU2MyBMMTQuOTQyNSwxMi41NjI4NzUgWiIvPgogICAgPHBhdGggZmlsbD0iIzRCNEI0QiIgZD0iTTE4LjczMDEyNSw5LjkyNjI1IEMxOS42NjQ1LDExLjU3NDYyNSAyMC42MTMyNSwxMy4yNDc4NzUgMjEuNTUzNSwxNC45MDU3NSBDMjYuMzA2LDEzLjQzNTM3NSAyOS44ODkyNSwxNi4wNjYyNSAzMS4xNzQ3NSwxOC44ODI4NzUgQzMyLjcyNzUsMjIuMjg1MjUgMzEuNjY2LDI2LjMxNSAyOC42MTY2MjUsMjguNDE0MTI1IEMyNS40ODY2MjUsMzAuNTY4ODc1IDIxLjUyODI1LDMwLjIwMDc1IDE4Ljc1NTEyNSwyNy40MzI3NSBDMTkuNDYxODc1LDI2Ljg0MTEyNSAyMC4xNzIxMjUsMjYuMjQ2ODc1IDIwLjkzMSwyNS42MTIgQzIzLjY3LDI3LjM4NiAyNi4wNjU2MjUsMjcuMzAyNSAyNy44NDQxMjUsMjUuMjAxNzUgQzI5LjM2MDc1LDIzLjQwOTYyNSAyOS4zMjc4NzUsMjAuNzM3NSAyNy43NjcyNSwxOC45ODMgQzI1Ljk2NjI1LDE2Ljk1ODM3NSAyMy41NTM4NzUsMTYuODk2NjI1IDIwLjYzNzg3NSwxOC44NDAxMjUgQzE5LjQyODI1LDE2LjY5NDEyNSAxOC4xOTc2MjUsMTQuNTY1MjUgMTcuMDI2MjUsMTIuNDAzNzUgQzE2LjYzMTI1LDExLjY3NTI1IDE2LjE5NTI1LDExLjI1MjUgMTUuMzA1LDExLjA5ODM3NSBDMTMuODE4Mzc1LDEwLjg0MDYyNSAxMi44NTg2MjUsOS41NjQgMTIuODAxLDguMTMzNzUgQzEyLjc0NDM3NSw2LjcxOTI1IDEzLjU3Nzc1LDUuNDQwNjI1IDE0Ljg4MDI1LDQuOTQyNSBDMTYuMTcwNSw0LjQ0ODg3NSAxNy42ODQ2MjUsNC44NDcyNSAxOC41NTI1LDUuOTQ0MjUgQzE5LjI2MTc1LDYuODQwNSAxOS40ODcxMjUsNy44NDkyNSAxOS4xMTM4NzUsOC45NTQ2MjUgQzE5LjAxMDEyNSw5LjI2Mjg3NSAxOC44NzU3NSw5LjU2MTEyNSAxOC43MzAxMjUsOS45MjYzNzUgTDE4LjczMDEyNSw5LjkyNjI1IFoiLz4KICAgIDxwYXRoIGZpbGw9IiM0QTRBNEEiIGQ9Ik0yMC45NjMzNzUsMjMuNDAxMjUgTDE1LjI0MjEyNSwyMy40MDEyNSBDMTQuNjkzNzUsMjUuNjU2NzUgMTMuNTA5MjUsMjcuNDc3NzUgMTEuNDY4Mzc1LDI4LjYzNTc1IEM5Ljg4MTc1LDI5LjUzNTc1IDguMTcxNzUsMjkuODQwODc1IDYuMzUxNzUsMjkuNTQ3IEMzLjAwMDc1LDI5LjAwNjYyNSAwLjI2MDc1LDI1Ljk5IDAuMDE5NSwyMi41OTMyNSBDLTAuMjUzNSwxOC43NDUyNSAyLjM5MTM3NSwxNS4zMjQ4NzUgNS45MTY3NSwxNC41NTY2MjUgQzYuMTYwMTI1LDE1LjQ0MDUgNi40MDYxMjUsMTYuMzMyODc1IDYuNjQ5NSwxNy4yMTQ2MjUgQzMuNDE1LDE4Ljg2NDg3NSAyLjI5NTUsMjAuOTQ0MTI1IDMuMjAwNzUsMjMuNTQ0MTI1IEMzLjk5NzYyNSwyNS44MzIxMjUgNi4yNjEyNSwyNy4wODYyNSA4LjcxOTEyNSwyNi42MDEyNSBDMTEuMjI5MTI1LDI2LjEwNiAxMi40OTQ2MjUsMjQuMDIgMTIuMzQwMTI1LDIwLjY3MjI1IEMxNC43MTk2MjUsMjAuNjcyMjUgMTcuMTAxMTI1LDIwLjY0NzYyNSAxOS40ODA4NzUsMjAuNjg0Mzc1IEMyMC40MTAxMjUsMjAuNjk5IDIxLjEyNzUsMjAuNjAyNjI1IDIxLjgyNzUsMTkuNzgzMzc1IEMyMi45OCwxOC40MzUzNzUgMjUuMTAxMzc1LDE4LjU1NyAyNi4zNDI2MjUsMTkuODMwMTI1IEMyNy42MTExMjUsMjEuMTMxMjUgMjcuNTUwMzc1LDIzLjIyNDc1IDI2LjIwOCwyNC40NzEgQzI0LjkxMjg3NSwyNS42NzM1IDIyLjg2Njc1LDI1LjYwOTI1IDIxLjY1NSwyNC4zMTM1IEMyMS40MDYsMjQuMDQ2NSAyMS4yMDk3NSwyMy43MjkzNzUgMjAuOTYzMzc1LDIzLjQwMTI1IFoiLz4KICA8L2c+Cjwvc3ZnPgo=")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Console
      '.codicon-symbol-variable:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+CiAgPGc+CiAgICA8cGF0aCBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xLjE1NzI1MDM4LDEyLjIyNDA0MjQgTDUuNzY4Mjc0MjgsOC4zMjAxOTk3OSBDNS45Nzg2MTMwOCw4LjE0MjEyMDEzIDUuOTc5MTQwOTUsNy44NTgzMjY3OCA1Ljc2ODI3NDI4LDcuNjc5ODAwMjEgTDEuMTU3MjUwMzgsMy43NzU5NTc2MyBDMC45NDc1ODMyMDYsMy41OTg0NDY1OSAwLjk0NzU4MzIwNiwzLjMxMDY0NDMyIDEuMTU3MjUwMzgsMy4xMzMxMzMyOCBDMS4zNjY5MTc1NiwyLjk1NTYyMjI0IDEuNzA2ODU1MjIsMi45NTU2MjIyNCAxLjkxNjUyMjQsMy4xMzMxMzMyOCBMNi41Mjc1NDYyOSw3LjAzNjk3NTg2IEM3LjE1ODI4MzU3LDcuNTcwOTc4NTMgNy4xNTY2ODUwNiw4LjQzMDM3NDgyIDYuNTI3NTQ2MjksOC45NjMwMjQxNCBMMS45MTY1MjI0LDEyLjg2Njg2NjcgQzEuNzA2ODU1MjIsMTMuMDQ0Mzc3OCAxLjM2NjkxNzU2LDEzLjA0NDM3NzggMS4xNTcyNTAzOCwxMi44NjY4NjY3IEMwLjk0NzU4MzIwNiwxMi42ODkzNTU3IDAuOTQ3NTgzMjA2LDEyLjQwMTU1MzQgMS4xNTcyNTAzOCwxMi4yMjQwNDI0IFogTTksMTIgTDE1LDEyIEwxNSwxMyBMOSwxMyBMOSwxMiBaIi8+CiAgPC9nPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Inference
      '.codicon-symbol-snippet:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAuNWEuNS41IDAgMCAwLTEgMGMwIC40Mi0uMTMgMS4wNjEtLjUwNiAxLjU4M0MxMC4xMzcgMi41NzkgOS41MzcgMyA4LjUgM2EuNS41IDAgMCAwIDAgMWMxLjAzNyAwIDEuNjM3LjQyIDEuOTk0LjkxN0MxMC44NyA1LjQ0IDExIDYuMDggMTEgNi41YS41LjUgMCAwIDAgMSAwYzAtLjQyLjEzLTEuMDYxLjUwNi0xLjU4My4zNTctLjQ5Ni45NTctLjkxNyAxLjk5NC0uOTE3YS41LjUgMCAwIDAgMC0xYy0xLjAzNyAwLTEuNjM3LS40Mi0xLjk5NC0uOTE3QTIuODUyIDIuODUyIDAgMCAxIDEyIC41Wm0uNTg0IDNhMy4xIDMuMSAwIDAgMS0uODktLjgzMyAzLjQwNyAzLjQwNyAwIDAgMS0uMTk0LS4zMDIgMy40MDcgMy40MDcgMCAwIDEtLjE5NC4zMDIgMy4xIDMuMSAwIDAgMS0uODkuODMzIDMuMSAzLjEgMCAwIDEgLjg5LjgzM2MuMDcuMDk5LjEzNi4yLjE5NC4zMDIuMDU5LS4xMDIuMTIzLS4yMDMuMTk0LS4zMDJhMy4xIDMuMSAwIDAgMSAuODktLjgzM1pNNiAzLjVhLjUuNSAwIDAgMC0xIDB2LjAwNmExLjk4NCAxLjk4NCAwIDAgMS0uMDA4LjE3MyA1LjY0IDUuNjQgMCAwIDEtLjA2My41MiA1LjY0NSA1LjY0NSAwIDAgMS0uNTAxIDEuNTc3Yy0uMjgzLjU2Ni0uNyAxLjExNy0xLjMxNSAxLjUyN0MyLjUwMSA3LjcxIDEuNjYzIDggLjUgOGEuNS41IDAgMCAwIDAgMWMxLjE2MyAwIDIuMDAxLjI5IDIuNjEzLjY5Ny42MTYuNDEgMS4wMzIuOTYgMS4zMTUgMS41MjcuMjg0LjU2Ny40MjggMS4xNC41IDEuNTc3YTUuNjQ1IDUuNjQ1IDAgMCAxIC4wNzIuNjkzdi4wMDVhLjUuNSAwIDAgMCAxIC4wMDF2LS4wMDZhMS45OTUgMS45OTUgMCAwIDEgLjAwOC0uMTczIDYuMTQgNi4xNCAwIDAgMSAuMDYzLS41MmMuMDczLS40MzYuMjE3LTEuMDEuNTAxLTEuNTc3LjI4My0uNTY2LjctMS4xMTcgMS4zMTUtMS41MjdDOC40OTkgOS4yOSA5LjMzNyA5IDEwLjUgOWEuNS41IDAgMCAwIDAtMWMtMS4xNjMgMC0yLjAwMS0uMjktMi42MTMtLjY5Ny0uNjE2LS40MS0xLjAzMi0uOTYtMS4zMTUtMS41MjdhNS42NDUgNS42NDUgMCAwIDEtLjUtMS41NzdBNS42NCA1LjY0IDAgMCAxIDYgMy41MDZWMy41Wm0xLjk4OSA1YTQuNzE3IDQuNzE3IDAgMCAxLS42NTctLjM2NWMtLjc5MS0uNTI4LTEuMzEyLTEuMjI3LTEuNjU0LTEuOTExYTUuOTQzIDUuOTQzIDAgMCAxLS4xNzgtLjM5MWMtLjA1My4xMy0uMTEyLjI2LS4xNzguMzktLjM0Mi42ODUtLjg2MyAxLjM4NC0xLjY1NCAxLjkxMmE0LjcxOCA0LjcxOCAwIDAgMS0uNjU3LjM2NWMuMjM2LjEwOC40NTQuMjMuNjU3LjM2NS43OTEuNTI4IDEuMzEyIDEuMjI3IDEuNjU0IDEuOTExLjA2Ni4xMzEuMTI1LjI2Mi4xNzguMzkxLjA1My0uMTMuMTEyLS4yNi4xNzgtLjM5LjM0Mi0uNjg1Ljg2My0xLjM4NCAxLjY1NC0xLjkxMi4yMDMtLjEzNS40MjEtLjI1Ny42NTctLjM2NVpNMTIuNSA5YS41LjUgMCAwIDEgLjUuNWMwIC40Mi4xMyAxLjA2MS41MDYgMS41ODMuMzU3LjQ5Ni45NTcuOTE3IDEuOTk0LjkxN2EuNS41IDAgMCAxIDAgMWMtMS4wMzcgMC0xLjYzNy40Mi0xLjk5NC45MTdBMi44NTIgMi44NTIgMCAwIDAgMTMgMTUuNWEuNS41IDAgMCAxLTEgMGMwLS40Mi0uMTMtMS4wNjEtLjUwNi0xLjU4My0uMzU3LS40OTYtLjk1Ny0uOTE3LTEuOTk0LS45MTdhLjUuNSAwIDAgMSAwLTFjMS4wMzcgMCAxLjYzNy0uNDIgMS45OTQtLjkxN0EyLjg1MiAyLjg1MiAwIDAgMCAxMiA5LjVhLjUuNSAwIDAgMSAuNS0uNVptLjE5NCAyLjY2N2MuMjMuMzIuNTI0LjYwNy44OS44MzNhMy4xIDMuMSAwIDAgMC0uODkuODMzIDMuNDIgMy40MiAwIDAgMC0uMTk0LjMwMiAzLjQyIDMuNDIgMCAwIDAtLjE5NC0uMzAyIDMuMSAzLjEgMCAwIDAtLjg5LS44MzMgMy4xIDMuMSAwIDAgMCAuODktLjgzM2MuMDctLjA5OS4xMzYtLjIuMTk0LS4zMDIuMDU5LjEwMi4xMjMuMjAzLjE5NC4zMDJaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // foreach
      '.codicon-symbol-method:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yIDhhNS45OCA1Ljk4IDAgMCAwIDEuNzU3IDQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDE0djFhNi45OCA2Ljk4IDAgMCAxLTQuOTUtMi4wNUE2Ljk4IDYuOTggMCAwIDEgMSA4YzAtMS43OS42ODMtMy41OCAyLjA0OC00Ljk0N2wuMDA0LS4wMDQuMDE5LS4wMkwzLjEgM0gxVjJoNHY0SDRWMy41MjVhNi41MSA2LjUxIDAgMCAwLS4yMi4yMWwtLjAxMy4wMTMtLjAwMy4wMDItLjAwNy4wMDdBNS45OCA1Ljk4IDAgMCAwIDIgOFptMTAuMjQzLTQuMjQzQTUuOTggNS45OCAwIDAgMCA4IDJWMWE2Ljk4IDYuOTggMCAwIDEgNC45NSAyLjA1QTYuOTggNi45OCAwIDAgMSAxNSA4YTYuOTggNi45OCAwIDAgMS0yLjA0NyA0Ljk0N2wtLjAwNS4wMDQtLjAxOC4wMi0uMDMuMDI5SDE1djFoLTR2LTRoMXYyLjQ3NWE2Ljc0NCA2Ljc0NCAwIDAgMCAuMjItLjIxbC4wMTMtLjAxMy4wMDMtLjAwMi4wMDctLjAwN0E1Ljk4IDUuOTggMCAwIDAgMTQgOGE1Ljk4IDUuOTggMCAwIDAtMS43NTctNC4yNDNaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // if
      '.codicon-symbol-keyword:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSwxMC4wMzc3MTg4IEM1LjYzNTI1ODUyLDkuMzg5NDQzNzcgNi41MjA2NTU5MSw4Ljk4NzIxMDE2IDcuNSw4Ljk4NzIxMDE2IEw5LjUsOC45ODcyMTAxNiBDMTAuNzMwNzc2NSw4Ljk4NzIxMDE2IDExLjc1MzgyNCw4LjA5NzgxNjE1IDExLjk2MTUwMTMsNi45MjY2NjkxNiBDMTEuMTE4NDg5Miw2LjY5MTU0NjExIDEwLjUsNS45MTgwMDA5OSAxMC41LDUgQzEwLjUsMy44OTU0MzA1IDExLjM5NTQzMDUsMyAxMi41LDMgQzEzLjYwNDU2OTUsMyAxNC41LDMuODk1NDMwNSAxNC41LDUgQzE0LjUsNS45NDI1NDI2MiAxMy44NDc5OTk3LDYuNzMyODAyNDEgMTIuOTcwNDE0Miw2Ljk0NDM2NDM4IEMxMi43NDY0MzcxLDguNjYxMzUwMDIgMTEuMjc4MDU0Miw5Ljk4NzIxMDE2IDkuNSw5Ljk4NzIxMDE2IEw3LjUsOS45ODcyMTAxNiBDNi4yNjA2ODU5Miw5Ljk4NzIxMDE2IDUuMjMxOTkyODYsMTAuODg4OTg1OSA1LjAzNDI5NDgxLDEyLjA3MjE2MzMgQzUuODc5NDUzODgsMTIuMzA1ODgzOCA2LjUsMTMuMDgwNDczNyA2LjUsMTQgQzYuNSwxNS4xMDQ1Njk1IDUuNjA0NTY5NSwxNiA0LjUsMTYgQzMuMzk1NDMwNSwxNiAyLjUsMTUuMTA0NTY5NSAyLjUsMTQgQzIuNSwxMy4wNjgwODAzIDMuMTM3Mzg2MzksMTIuMjg1MDMwMSA0LDEyLjA2MzAwODcgTDQsMy45MzY5OTEyNiBDMy4xMzczODYzOSwzLjcxNDk2OTg2IDIuNSwyLjkzMTkxOTcxIDIuNSwyIEMyLjUsMC44OTU0MzA1IDMuMzk1NDMwNSwwIDQuNSwwIEM1LjYwNDU2OTUsMCA2LjUsMC44OTU0MzA1IDYuNSwyIEM2LjUsMi45MzE5MTk3MSA1Ljg2MjYxMzYxLDMuNzE0OTY5ODYgNSwzLjkzNjk5MTI2IEw1LDEwLjAzNzcxODggWiBNNC41LDMgQzUuMDUyMjg0NzUsMyA1LjUsMi41NTIyODQ3NSA1LjUsMiBDNS41LDEuNDQ3NzE1MjUgNS4wNTIyODQ3NSwxIDQuNSwxIEMzLjk0NzcxNTI1LDEgMy41LDEuNDQ3NzE1MjUgMy41LDIgQzMuNSwyLjU1MjI4NDc1IDMuOTQ3NzE1MjUsMyA0LjUsMyBaIE00LjUsMTUgQzUuMDUyMjg0NzUsMTUgNS41LDE0LjU1MjI4NDcgNS41LDE0IEM1LjUsMTMuNDQ3NzE1MyA1LjA1MjI4NDc1LDEzIDQuNSwxMyBDMy45NDc3MTUyNSwxMyAzLjUsMTMuNDQ3NzE1MyAzLjUsMTQgQzMuNSwxNC41NTIyODQ3IDMuOTQ3NzE1MjUsMTUgNC41LDE1IFogTTEyLjUsNiBDMTMuMDUyMjg0Nyw2IDEzLjUsNS41NTIyODQ3NSAxMy41LDUgQzEzLjUsNC40NDc3MTUyNSAxMy4wNTIyODQ3LDQgMTIuNSw0IEMxMS45NDc3MTUzLDQgMTEuNSw0LjQ0NzcxNTI1IDExLjUsNSBDMTEuNSw1LjU1MjI4NDc1IDExLjk0NzcxNTMsNiAxMi41LDYgWiIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // parallel
      '.codicon-symbol-class:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNNSAyYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXptNiAwYTEgMSAwIDAwLTEgMXYxMGExIDEgMCAxMDIgMFYzYTEgMSAwIDAwLTEtMXoiIC8+Cjwvc3ZnPg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // merge
      '.codicon-symbol-interface:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMC4zNTQgOC4zNTQgMTQuMjA3IDQuNSAxMC4zNTMuNjQ2bC0uNzA3LjcwOEwxMi4yOTMgNEgydjFoMTAuMjkzTDkuNjQ2IDcuNjQ2bC43MDcuNzA4Wm0tNC43MDcgN0wxLjc5MyAxMS41bDMuODU0LTMuODU0LjcwNy43MDhMMy43MDcgMTFIMTR2MUgzLjcwN2wyLjY0NyAyLjY0Ni0uNzA3LjcwOFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // wait
      '.codicon-symbol-constant:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // alert
      '.codicon-symbol-customcolor:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOSAxMmExIDEgMCAxIDEtMiAwIDEgMSAwIDAgMSAyIDBaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNy41IDEwVjVoMXY1aC0xWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOCAxYTEgMSAwIDAgMSAuODY0LjQ5Nmw3IDEyQTEgMSAwIDAgMSAxNSAxNUgxYTEgMSAwIDAgMS0uODY0LTEuNTA0bDctMTJBMSAxIDAgMCAxIDggMVpNMSAxNGgxNEw4IDIgMSAxNFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPgo8L3N2Zz4K")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // scheduled
      '.codicon-symbol-operator:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBkPSJNOC41IDcuNVY0aC0xdjQuNUgxMnYtMUg4LjVaIi8+CiAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTUgOEE3IDcgMCAxIDEgMSA4YTcgNyAwIDAgMSAxNCAwWm0tMSAwQTYgNiAwIDEgMSAyIDhhNiA2IDAgMCAxIDEyIDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz4KPC9zdmc+Cg==")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // manual
      '.codicon-symbol-type-parameter:before': {
        content: '" "',
        width: '16px',
        height: '16px',
        backgroundImage:
          'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zLjI5MyA5LjI5MyA0IDEwbC0xIDRoMTBsLTEtNCAuNzA3LS43MDdhMSAxIDAgMCAxIC4yNjMuNDY0bDEgNEExIDEgMCAwIDEgMTMgMTVIM2ExIDEgMCAwIDEtLjk3LTEuMjQybDEtNGExIDEgMCAwIDEgLjI2My0uNDY1Wk04IDljMyAwIDQgMSA0IDEgLjcwNy0uNzA3LjcwNi0uNzA4LjcwNi0uNzA4bC0uMDAxLS4wMDEtLjAwMi0uMDAyLS4wMDUtLjAwNS0uMDEtLjAxYTEuNzk4IDEuNzk4IDAgMCAwLS4xMDEtLjA4OSAyLjkwNyAyLjkwNyAwIDAgMC0uMjM1LS4xNzMgNC42NiA0LjY2IDAgMCAwLS44NTYtLjQ0IDcuMTEgNy4xMSAwIDAgMC0xLjEzNi0uMzQyIDQgNCAwIDEgMC00LjcyIDAgNy4xMSA3LjExIDAgMCAwLTEuMTM2LjM0MiA0LjY2IDQuNjYgMCAwIDAtLjg1Ni40NCAyLjkwOSAyLjkwOSAwIDAgMC0uMzM1LjI2MmwtLjAxMS4wMS0uMDA1LjAwNS0uMDAyLjAwMmgtLjAwMVMzLjI5MyA5LjI5NCA0IDEwYzAgMCAxLTEgNC0xWm0wLTFhMyAzIDAgMSAwIDAtNiAzIDMgMCAwIDAgMCA2WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+Cjwvc3ZnPgo=")',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        display: 'block',
      },

      // Diff highlighting styles (from main branch)
      '.changed-line-highlight': {
        backgroundColor: euiTheme.colors.backgroundLightWarning,
        borderLeft: `2px solid ${euiTheme.colors.warning}`,
        opacity: 0.7,
      },
      '.changed-line-margin': {
        backgroundColor: euiTheme.colors.warning,
        width: '2px',
        opacity: 0.7,
      },
    }),
  editorContainer: css({
    flex: '1 1 0',
    minWidth: 0,
    overflowY: 'auto',
    minHeight: 0,
  }),
  validationErrorsContainer: css({
    flexShrink: 0,
    overflow: 'hidden',
  }),
};
