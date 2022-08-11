/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import {
  ApiDeclaration,
  ScopeApi,
  TypeKind,
  Lifecycle,
  PluginApi,
  ApiScope,
  PluginOrPackage,
} from './types';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const camelToSnake = (str: string): string => str.replace(/([A-Z])/g, '_$1').toLowerCase();

export const snakeToCamel = (str: string): string =>
  str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));

/**
 * Returns the plugin that the file belongs to.
 * @param filePath An absolute file path that can point to a file nested inside a plugin
 * @param plugins A list of plugins to search through.
 */
export function getPluginForPath(
  filePath: string,
  plugins: PluginOrPackage[]
): PluginOrPackage | undefined {
  if (filePath.indexOf('@') >= 0) {
    return plugins.find(
      (plugin) => !plugin.isPlugin && filePath.indexOf(plugin.manifest.id + path.sep) >= 0
    );
  } else {
    return plugins.find((plugin) => filePath.startsWith(plugin.directory + path.sep));
  }
}

/**
 * Groups ApiDeclarations by typescript kind - classes, functions, enums, etc, so they
 * can be displayed separately in the mdx files.
 */
export function groupPluginApi(declarations: ApiDeclaration[]): ScopeApi {
  const scope = createEmptyScope();

  declarations.forEach((declaration) => {
    addApiDeclarationToScope(declaration, scope);
  });

  scope.classes.sort((a, b) => a.label.localeCompare(b.label));
  scope.interfaces.sort((a, b) => a.label.localeCompare(b.label));
  scope.functions.sort((a, b) => a.label.localeCompare(b.label));
  scope.objects.sort((a, b) => a.label.localeCompare(b.label));
  scope.enums.sort((a, b) => a.label.localeCompare(b.label));
  scope.misc.sort((a, b) => a.label.localeCompare(b.label));

  return scope;
}

function escapeRegExp(regexp: string) {
  return regexp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * If the file is at the top level, returns undefined, otherwise returns the
 * name of the first nested folder in the plugin. For example a path of
 * 'src/plugins/data/public/search_services/file.ts' would return 'search_service' while
 * 'src/plugin/data/server/file.ts' would return undefined.
 * @param filePath
 */
export function getServiceForPath(filePath: string, pluginDirectory: string): string | undefined {
  const dir = escapeRegExp(pluginDirectory);
  const publicMatchGroups = filePath.match(`${dir}\/public\/([^\/]*)\/`);
  const serverMatchGroups = filePath.match(`${dir}\/server\/([^\/]*)\/`);
  const commonMatchGroups = filePath.match(`${dir}\/common\/([^\/]*)\/`);

  if (publicMatchGroups && publicMatchGroups.length > 1) {
    return publicMatchGroups[1];
  } else if (serverMatchGroups && serverMatchGroups.length > 1) {
    return serverMatchGroups[1];
  } else if (commonMatchGroups && commonMatchGroups.length > 1) {
    return commonMatchGroups[1];
  }
}

export function getPluginApiDocId(
  id: string,
  serviceInfo?: {
    serviceFolders: readonly string[];
    apiPath: string;
    directory: string;
  }
) {
  let service = '';
  const cleanName = id.replace('@', '').replace(/[./\\]/gi, '_');
  if (serviceInfo) {
    const serviceName = getServiceForPath(serviceInfo.apiPath, serviceInfo.directory);
    const serviceFolder = serviceInfo.serviceFolders?.find((f) => f === serviceName);

    if (serviceFolder) {
      service = snakeToCamel(serviceFolder);
    }
  }

  return `kib${capitalize(snakeToCamel(cleanName)) + capitalize(service)}PluginApi`;
}

export function getApiSectionId({ id, scope }: { id: string; scope: ApiScope }) {
  // Clean up the name. Things like destructured function parameters can have really long names with brackets and commas.
  const cleanName = id.replace(/[^A-Za-z_.$0-9]+/g, '');
  return `def-${scope}.${cleanName}`;
}

export function countScopeApi(api: ScopeApi): number {
  return (
    (api.setup ? 1 : 0) +
    (api.start ? 1 : 0) +
    api.classes.length +
    api.interfaces.length +
    api.functions.length +
    api.objects.length +
    api.enums.length +
    api.misc.length
  );
}

export function createEmptyScope(): ScopeApi {
  return {
    classes: [],
    functions: [],
    interfaces: [],
    enums: [],
    misc: [],
    objects: [],
  };
}

/**
 * Takes the ApiDeclaration and puts it in the appropriate section of the ScopeApi based
 * on its TypeKind.
 */
export function addApiDeclarationToScope(declaration: ApiDeclaration, scope: ScopeApi): void {
  if (declaration.lifecycle === Lifecycle.SETUP) {
    scope.setup = declaration;
  } else if (declaration.lifecycle === Lifecycle.START) {
    scope.start = declaration;
  } else {
    switch (declaration.type) {
      case TypeKind.ClassKind:
        scope.classes.push(declaration);
        break;
      case TypeKind.InterfaceKind:
        scope.interfaces.push(declaration);
        break;
      case TypeKind.EnumKind:
        scope.enums.push(declaration);
        break;
      case TypeKind.FunctionKind:
        scope.functions.push(declaration);
        break;
      case TypeKind.ObjectKind:
        scope.objects.push(declaration);
        break;
      default:
        scope.misc.push(declaration);
    }
  }
}

/**
 * Loops through the signatures of every API declarations for the given pluginApi. If any are external references that
 * don't actually exist inside `pluginApiMap`, it will remove the link and replace the signature with just the text. This way we avoid
 * broken links in the docs system.
 * @param pluginApi - The plugin API that will have all missing reference links removed.
 * @param missingApiItems - Collects all the missing API items encountered so this information can be displayed as stats.
 * @param pluginApiMap - Used to look up the referenced API items from other plugins.
 * @param log
 */
export function removeBrokenLinks(
  pluginApi: PluginApi,
  missingApiItems: { [key: string]: { [key: string]: string[] } },
  pluginApiMap: { [key: string]: PluginApi },
  log: ToolingLog
) {
  let missingCnt = 0;
  (['client', 'common', 'server'] as Array<'client' | 'server' | 'common'>).forEach((scope) => {
    pluginApi[scope].forEach((api) => {
      missingCnt += removeBrokenLinksFromApi(pluginApi.id, api, missingApiItems, pluginApiMap);
    });
  });

  if (missingCnt > 0) {
    log.info(
      `${pluginApi.id} had ${missingCnt} API item references removed to avoid broken links use the flag '--stats exports' to get a list of every missing export `
    );
  }
}

function removeBrokenLinksFromApi(
  pluginId: string,
  api: ApiDeclaration,
  missingApiItems: { [key: string]: { [key: string]: string[] } },
  pluginApiMap: { [key: string]: PluginApi }
): number {
  let missingCnt = 0;
  if (api.signature) {
    api.signature = api.signature.map((sig) => {
      if (typeof sig !== 'string') {
        if (!apiItemExists(sig.text, sig.scope, pluginApiMap[sig.pluginId])) {
          if (missingApiItems[sig.pluginId] === undefined) {
            missingApiItems[sig.pluginId] = {};
          }
          const sourceId = `${sig.pluginId}-${sig.scope}-${sig.text}`;
          if (missingApiItems[sig.pluginId][sourceId] === undefined) {
            missingApiItems[sig.pluginId][sourceId] = [];
          }

          missingApiItems[sig.pluginId][sourceId].push(`${pluginId}-${api.id}`);

          missingCnt++;
          return sig.text;
        }
        return sig;
      }
      return sig;
    });
  }
  if (api.children) {
    api.children.forEach((child) => {
      missingCnt += removeBrokenLinksFromApi(pluginId, child, missingApiItems, pluginApiMap);
    });
  }
  return missingCnt;
}

function apiItemExists(name: string, scope: ApiScope, pluginApi: PluginApi): boolean {
  return (
    pluginApi[scopeAccessor(scope)].findIndex((dec: ApiDeclaration) => dec.label === name) >= 0
  );
}

export function getFileName(name: string): string {
  // Remove the initial `@` if one exists, then replace all dots, slashes and dashes with an `_`.
  return camelToSnake(name.replace(/@/gi, '').replace(/[.\\/-]/gi, '_'));
}

export function getSlug(name: string): string {
  // Remove the initial `@` if one exists, then replace all dots and slashes with a `-`.
  return name.replace(/@/gi, '').replace(/[.\\/]/gi, '-');
}

function scopeAccessor(scope: ApiScope): 'server' | 'common' | 'client' {
  switch (scope) {
    case ApiScope.CLIENT:
      return 'client';
    case ApiScope.SERVER:
      return 'server';
    default:
      return 'common';
  }
}

export const isInternal = (dec: ApiDeclaration) => {
  return dec.tags && dec.tags.find((tag) => tag === 'internal');
};
