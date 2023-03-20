/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PartialTheme } from '@elastic/charts';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

export const extractContainerType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.type) {
        return item;
      } else if (item.child) {
        return recursiveGet(item.child);
      }
    };
    return recursiveGet(context)?.type;
  }
};

export const extractVisualizationType = (context?: KibanaExecutionContext): string | undefined => {
  if (context) {
    const recursiveGet = (item: KibanaExecutionContext): KibanaExecutionContext | undefined => {
      if (item.child) {
        return recursiveGet(item.child);
      } else {
        return item;
      }
    };
    return recursiveGet(context)?.type;
  }
};

/**
 * Get an override specification and returns a props object to use directly with the Component
 * @param overrides Overrides object
 * @param componentName name of the Component to look for (i.e. "settings", "axisX")
 * @returns an props object to use directly with the component
 */
export function getOverridesFor<
  // Component props
  P extends Record<string, unknown>,
  // Overrides
  O extends Record<string, P>,
  // Overrides Component names
  K extends keyof O
>(overrides: O | undefined, componentName: K) {
  if (!overrides || !overrides[componentName]) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(overrides[componentName]).map(([key, value]) => {
      if (value === 'ignore') {
        return [key, undefined];
      }
      return [key, value];
    })
  );
}
// Extract from the Chart Partial theme type only object keys
type ObjectThemeTypes = Extract<PartialTheme, object>;

function getComponentTheme<T extends keyof ObjectThemeTypes>(
  theme: PartialTheme | PartialTheme[] | undefined,
  component: T
): ObjectThemeTypes[T] | undefined {
  return Array.isArray(theme) ? theme[0]?.[component] : theme?.[component];
}

export function mergeThemeWithOverrides<T extends keyof ObjectThemeTypes>(
  theme: PartialTheme,
  themeOverrides: PartialTheme | PartialTheme[] | undefined = {},
  components: T[]
): PartialTheme {
  const componentThemeOverrides: ObjectThemeTypes = {};
  if (themeOverrides) {
    for (const component of components) {
      const componentOverride = getComponentTheme(themeOverrides, component);
      if (componentOverride) {
        componentThemeOverrides[component] = {
          ...(theme[component] ?? {}),
          ...(componentOverride ?? {}),
        } as ObjectThemeTypes[T];
      }
    }
  }
  return {
    ...themeOverrides,
    ...theme,
    ...componentThemeOverrides,
  };
}
