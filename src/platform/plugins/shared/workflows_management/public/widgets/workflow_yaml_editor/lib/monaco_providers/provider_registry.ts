/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MonacoConnectorHandler, MonacoHandlerRegistry } from './provider_interfaces';

/**
 * Registry for managing Monaco connector handlers
 * Implements singleton pattern for global access
 */
class MonacoConnectorHandlerRegistry implements MonacoHandlerRegistry {
  private handlers: MonacoConnectorHandler[] = [];

  /**
   * Register a new Monaco connector handler
   */
  register(handler: MonacoConnectorHandler): void {
    // Check if handler is already registered
    if (this.handlers.includes(handler)) {
      // console.warn('MonacoConnectorHandlerRegistry: Handler already registered');
      return;
    }

    this.handlers.push(handler);

    // Sort by priority (highest first)
    this.handlers.sort((a, b) => b.getPriority() - a.getPriority());

    // console.log(
    //   `MonacoConnectorHandlerRegistry: Registered handler with priority ${handler.getPriority()}`
    // );
  }

  /**
   * Get the best handler for a connector type (highest priority that can handle it)
   */
  getHandler(connectorType: string): MonacoConnectorHandler | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(connectorType)) {
        return handler;
      }
    }
    return null;
  }

  /**
   * Get all handlers that can handle a connector type (sorted by priority)
   */
  getHandlers(connectorType: string): MonacoConnectorHandler[] {
    return this.handlers.filter((handler) => handler.canHandle(connectorType));
  }

  /**
   * Unregister a handler
   */
  unregister(handler: MonacoConnectorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      // console.log('MonacoConnectorHandlerRegistry: Unregistered handler');
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers = [];
    // console.log('MonacoConnectorHandlerRegistry: Cleared all handlers');
  }

  /**
   * Get count of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Get debug information about registered handlers
   */
  getDebugInfo(): Array<{ priority: number; canHandle: string[] }> {
    return this.handlers.map((handler) => ({
      priority: handler.getPriority(),
      canHandle: ['elasticsearch.', 'kibana.', 'http.', 'console.', 'slack.'].filter((prefix) =>
        handler.canHandle(`${prefix}test`)
      ),
    }));
  }
}

// Global singleton instance
const handlerRegistry = new MonacoConnectorHandlerRegistry();

/**
 * Get the global Monaco handler registry instance
 */
export function getMonacoHandlerRegistry(): MonacoHandlerRegistry {
  return handlerRegistry;
}

/**
 * Convenience function to register a Monaco connector handler
 */
export function registerMonacoConnectorHandler(handler: MonacoConnectorHandler): void {
  handlerRegistry.register(handler);
}

/**
 * Convenience function to get a Monaco handler for a connector type
 */
export function getMonacoConnectorHandler(connectorType: string): MonacoConnectorHandler | null {
  return handlerRegistry.getHandler(connectorType);
}

/**
 * Cleanup function for tests and hot reloading
 */
export function clearHandlerRegistry(): void {
  handlerRegistry.clear();
}
