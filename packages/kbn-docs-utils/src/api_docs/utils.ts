/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin } from '@kbn/dev-utils';
import {
  AnchorLink,
  ApiDeclaration,
  ScopeApi,
  TypeKind,
  Lifecycle,
  PluginApi,
  Reference,
  ApiScope,
} from './types';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const camelToSnake = (str: string): string =>
  str
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .join('_')
    .toLowerCase();

export const snakeToCamel = (str: string): string =>
  str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''));

/**
 * Returns the plugin that the file belongs to.
 * @param path An absolute file path that can is nested inside a plugin
 * @param plugins A list of plugins to search through.
 */
export function getPluginForPath(
  path: string,
  plugins: KibanaPlatformPlugin[]
): KibanaPlatformPlugin | undefined {
  return plugins.find((plugin) => path.includes(plugin.relativeDirectory));
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

  return scope;
}

/**
 * If the file is at the top level, returns undefined, otherwise returns the
 * name of the first nested folder in the plugin. For example a path of
 * 'src/plugins/data/public/search_services/file.ts' would return 'search_service' while
 * 'src/plugin/data/server/file.ts' would return undefined.
 * @param path
 */
export function getServiceForPath(path: string): string | undefined {
  const publicMatchGroups = path.match(/.*\/public\/(.*?)\/.*.ts/);
  const serverMatchGroups = path.match(/.*\/server\/(.*?)\/.*.ts/);
  const commonMatchGroups = path.match(/.*\/common\/(.*?)\/.*.ts/);
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
  serviceFolders?: readonly string[],
  apiPath?: string
) {
  let service = '';
  const cleanName = id.replace('.', '_');
  if (apiPath) {
    const serviceName = getServiceForPath(apiPath);
    const serviceFolder = serviceFolders?.find((f) => f === serviceName);

    if (serviceFolder) {
      service = snakeToCamel(serviceFolder);
    }
  }

  return `kib${capitalize(snakeToCamel(cleanName)) + capitalize(service)}PluginApi`;
}

export function getApiSectionId(link: AnchorLink) {
  const id = `def-${link.scope}.${link.apiName}`.replace(' ', '-');
  return id;
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

export function removeBrokenLinks(
  pluginApi: PluginApi,
  missingApiItems: { [key: string]: string[] },
  pluginApiMap: { [key: string]: PluginApi }
) {
  (['client', 'common', 'server'] as Array<'client' | 'server' | 'common'>).forEach((scope) => {
    pluginApi[scope].forEach((api) => {
      if (api.signature) {
        api.signature = api.signature.map((sig) => {
          if (typeof sig !== 'string') {
            const ref = sig as Reference;
            if (apiItemExists(ref.text, ref.scope, pluginApiMap[ref.pluginId]) === false) {
              if (missingApiItems[ref.pluginId] === undefined) {
                missingApiItems[ref.pluginId] = [];
              }
              missingApiItems[ref.pluginId].push(`${ref.scope}.${ref.text}`);
              return ref.text;
            }
          }
          return sig;
        });
      }
    });
  });
}

function apiItemExists(name: string, scope: ApiScope, pluginApi: PluginApi): boolean {
  return (
    pluginApi[scopeAccessor(scope)].findIndex((dec: ApiDeclaration) => dec.label === name) >= 0
  );
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
