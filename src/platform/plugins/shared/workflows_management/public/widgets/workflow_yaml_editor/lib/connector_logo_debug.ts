/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STACK_CONNECTOR_LOGOS } from '@kbn/stack-connectors-plugin/public';

import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';

/**
 * Debug utility to explore available connectors and their logo types
 * Use this in the browser console to see what's available
 */
export function debugConnectorLogos(services: any): void {
  if (!services?.triggersActionsUi?.actionTypeRegistry) {
    console.log('❌ No action type registry available');
    return;
  }

  const actionTypeRegistry = services.triggersActionsUi.actionTypeRegistry;
  const actionTypes = actionTypeRegistry.list();

  console.log('🔍 Available Connector Types:');
  console.table(
    actionTypes.map((actionType: ActionTypeModel) => ({
      id: actionType.id,
      title: actionType.actionTypeTitle || 'N/A',
      iconType: typeof actionType.iconClass,
      hasLogo: actionType.iconClass && typeof actionType.iconClass !== 'string',
      iconClass: typeof actionType.iconClass === 'string' ? actionType.iconClass : '[Component]'
    }))
  );

  // Show connectors with logo components
  const connectorsWithLogos = actionTypes.filter(
    (actionType: ActionTypeModel) => actionType.iconClass && typeof actionType.iconClass !== 'string'
  );

  console.log('\n🎨 Connectors with Logo Components:');
  connectorsWithLogos.forEach((actionType: ActionTypeModel) => {
    console.log(`- ${actionType.id}: ${actionType.actionTypeTitle || 'N/A'}`);
  });

  // Show connectors with EUI icons
  const connectorsWithEuiIcons = actionTypes.filter(
    (actionType: ActionTypeModel) => typeof actionType.iconClass === 'string'
  );

  console.log('\n🔧 Connectors with EUI Icons:');
  connectorsWithEuiIcons.forEach((actionType: ActionTypeModel) => {
    console.log(`- ${actionType.id}: ${actionType.iconClass}`);
  });
}

/**
 * Show available stack connector logos
 */
export function showStackConnectorLogos(): void {
  try {
    const availableLogos = Object.keys(STACK_CONNECTOR_LOGOS);
    
    console.log('🎨 Available Stack Connector Logos:');
    availableLogos.forEach(connectorType => {
      console.log(`- ${connectorType}`);
    });
    
    console.log(`\n📊 Total: ${availableLogos.length} stack connector logos available`);
  } catch (error) {
    console.log('❌ Failed to load stack connector logos:', error);
  }
}

/**
 * Test extracting a specific connector's logo
 */
export async function testConnectorLogo(connectorId: string, services: any): Promise<void> {
  if (!services?.triggersActionsUi?.actionTypeRegistry) {
    console.log('❌ No action type registry available');
    return;
  }

  const actionTypeRegistry = services.triggersActionsUi.actionTypeRegistry;
  
  if (!actionTypeRegistry.has(connectorId)) {
    console.log(`❌ Connector '${connectorId}' not found in registry`);
    return;
  }

  console.log(`🔍 Testing connector: ${connectorId}`);
  
  // Check if it has a stack connector logo
  if (connectorId in STACK_CONNECTOR_LOGOS) {
    console.log(`🎨 Has stack connector logo!`);
    
    try {
      const LogoComponent = STACK_CONNECTOR_LOGOS[connectorId as keyof typeof STACK_CONNECTOR_LOGOS];
      const logoElement = React.createElement(LogoComponent, { width: 32, height: 32 });
      const svgString = renderToStaticMarkup(logoElement);
      const base64 = btoa(svgString);
      
      console.log(`✅ Successfully extracted stack connector logo (${base64.length} chars)`);
      console.log(`🖼️ Data URL: data:image/svg+xml;base64,${base64}`);
      return;
    } catch (error) {
      console.log(`❌ Failed to extract stack connector logo:`, error);
    }
  }
  
  // Fallback to action registry
  const actionTypeModel = actionTypeRegistry.get(connectorId);
  console.log(`📋 Title: ${actionTypeModel.actionTypeTitle || 'N/A'}`);
  console.log(`🎨 Icon type: ${typeof actionTypeModel.iconClass}`);
  
  if (typeof actionTypeModel.iconClass === 'string') {
    console.log(`🎨 Has EUI icon: ${actionTypeModel.iconClass}`);
    console.log(`ℹ️ This would use a simple EUI icon (not extracted in this debug function)`);
  } else if (actionTypeModel.iconClass) {
    console.log(`🎨 Has logo component (but not a stack connector logo)`);
    console.log(`ℹ️ This connector uses a custom logo component that would need special handling`);
  } else {
    console.log(`❌ No icon available - would use default fallback`);
  }
}

/**
 * Add debug functions to window for easy access in browser console
 */
export function addDebugToWindow(services: any): void {
  if (typeof window !== 'undefined') {
    (window as any).debugConnectorLogos = () => debugConnectorLogos(services);
    (window as any).testConnectorLogo = (connectorId: string) => testConnectorLogo(connectorId, services);
    (window as any).showStackConnectorLogos = () => showStackConnectorLogos();
    
    console.log('🔧 Debug functions added to window:');
    console.log('- debugConnectorLogos() - List all available connectors');
    console.log('- testConnectorLogo(connectorId) - Test extracting a specific connector logo');
    console.log('- showStackConnectorLogos() - Show available stack connector logos');
  }
}
