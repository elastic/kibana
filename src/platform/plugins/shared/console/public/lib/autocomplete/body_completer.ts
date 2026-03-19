/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import _ from 'lodash';
import { WalkingState, walkTokenPath, wrapComponentWithDefaults } from './engine';
import {
  ConstantComponent,
  SharedComponent,
  ObjectComponent,
  ConditionalProxy,
  GlobalOnlyComponent,
} from './components';
import type { AutoCompleteContext, ResultTerm } from './types';
import { isRecord } from '../../../common/utils/record_utils';
import { asArray } from '../utils/array_utils';
import type {
  AutocompleteComponent,
  AutocompleteMatch,
  AutocompleteMatchResult,
  AutocompleteTermDefinition,
} from './components/autocomplete_component';

interface ParametrizedComponentFactories {
  getComponent: (
    value: string,
    isValue?: boolean
  ) =>
    | ((value: string, parent: SharedComponent | undefined, template?: unknown) => SharedComponent)
    | undefined;
}

class CompilingContext {
  public readonly endpointId: string;
  public readonly parametrizedComponentFactories: ParametrizedComponentFactories;

  constructor(endpointId: string, parametrizedComponentFactories: ParametrizedComponentFactories) {
    this.parametrizedComponentFactories = parametrizedComponentFactories;
    this.endpointId = endpointId;
  }
}

type BodyCompleterContext = AutoCompleteContext & {
  endpointComponentResolver: (endpoint: string) => AutocompleteComponent[] | undefined | null;
  globalComponentResolver: (
    term: string,
    nested?: boolean
  ) => AutocompleteComponent[] | undefined | null;
  requestStartRow?: number | null;
};

/**
 * An object to resolve scope links (syntax endpoint.path1.path2)
 * @param link the link either string (endpoint.path1.path2, or .path1.path2) or a function (context,editor)
 * which returns a description to be compiled
 * @constructor
 * @param compilingContext
 *
 *
 * For this to work we expect the context to include a method context.endpointComponentResolver(endpoint)
 * which should return the top level components for the given endpoint
 */

function resolvePathToComponents(
  tokenPath: string[],
  context: BodyCompleterContext,
  editor: unknown,
  components: AutocompleteComponent[]
): AutocompleteComponent[] {
  const walkStates = walkTokenPath(
    tokenPath,
    [new WalkingState('ROOT', components, [])],
    context,
    editor
  );
  return walkStates.reduce<AutocompleteComponent[]>((acc, ws) => acc.concat(ws.components), []);
}

class ScopeResolver extends SharedComponent {
  private link: unknown;
  private compilingContext: CompilingContext;

  constructor(link: unknown, compilingContext: CompilingContext) {
    super('__scope_link');
    if (_.isString(link) && link[0] === '.') {
      // relative link, inject current endpoint
      if (link === '.') {
        link = compilingContext.endpointId;
      } else {
        link = compilingContext.endpointId + link;
      }
    }
    this.link = link;
    this.compilingContext = compilingContext;
  }

  resolveLinkToComponents(context: BodyCompleterContext, editor: unknown): AutocompleteComponent[] {
    if (_.isFunction(this.link)) {
      const desc = this.link(context, editor);
      return compileDescription(desc, this.compilingContext);
    }
    if (!_.isString(this.link)) {
      throw new Error(`unsupported link format: ${String(this.link)}`);
    }

    let path = this.link.replace(/\./g, '{').split(/(\{)/);
    const endpoint = path[0];
    let components: AutocompleteComponent[] | undefined | null;
    try {
      if (endpoint === 'GLOBAL') {
        // global rules need an extra indirection
        if (path.length < 3) {
          throw new Error('missing term in global link: ' + this.link);
        }
        const term = path[2];
        components = context.globalComponentResolver(term);
        path = path.slice(3);
      } else {
        path = path.slice(1);
        components = context.endpointComponentResolver(endpoint);
      }
    } catch (e) {
      throw new Error('failed to resolve link [' + this.link + ']: ' + e);
    }
    return resolvePathToComponents(path, context, editor, components ?? []);
  }

  getTerms(context: BodyCompleterContext, editor: unknown): AutocompleteTermDefinition[] {
    const options: AutocompleteTermDefinition[] = [];
    const components = this.resolveLinkToComponents(context, editor);
    _.each(components, function (component) {
      const terms = component.getTerms(context, editor);
      if (terms) {
        options.push(...terms);
      }
    });
    return options;
  }

  match(token: unknown, context: BodyCompleterContext, editor: unknown): AutocompleteMatch {
    const result: AutocompleteMatchResult & { next: AutocompleteComponent[] } = {
      next: [],
    };
    const components = this.resolveLinkToComponents(context, editor);
    _.each(components, function (component) {
      const componentResult = component.match(token, context, editor);
      if (componentResult && componentResult.next) {
        result.next.push(...asArray(componentResult.next));
      }
    });

    return result;
  }
}

const getTemplate = (description: unknown): unknown => {
  if (isRecord(description) && description.__template !== undefined) {
    const template = description.__template;
    const raw = description.__raw;

    if (raw && _.isString(template)) {
      return {
        // This is a special secret attribute that gets passed through to indicate that
        // the raw value should be passed through to the console without JSON.stringifying it
        // first.
        //
        // Primary use case is to allow __templates to contain extended JSON special values like
        // triple quotes.
        __raw: true,
        value: template,
      };
    }

    return template;
  }

  if (isRecord(description) && Array.isArray(description.__one_of)) {
    return getTemplate(description.__one_of[0]);
  }

  if (isRecord(description) && Array.isArray(description.__any_of)) {
    return [];
  }

  if (isRecord(description) && description.__scope_link !== undefined) {
    // assume an object for now.
    return {};
  }

  if (Array.isArray(description)) {
    if (description.length === 1) {
      if (_.isObject(description[0])) {
        // shortcut to save typing
        const innerTemplate = getTemplate(description[0]);

        return innerTemplate != null ? [innerTemplate] : [];
      }
    }
    return [];
  }

  if (_.isObject(description)) {
    return {};
  }

  if (_.isString(description) && !/^\{.*\}$/.test(description)) {
    return description;
  }

  return description;
};

const getOptions = (description: unknown): ResultTerm => {
  const options: ResultTerm = {};
  const template = getTemplate(description);

  if (!_.isUndefined(template)) {
    options.template = template;
  }
  return options;
};

/**
 * @param description a json dict describing the endpoint
 * @param compilingContext
 */
function compileDescription(
  description: unknown,
  compilingContext: CompilingContext
): SharedComponent[] {
  if (Array.isArray(description)) {
    return [compileList(description, compilingContext)];
  }

  if (isRecord(description)) {
    // test for objects list as arrays are also objects
    if (description.__scope_link !== undefined) {
      return [new ScopeResolver(description.__scope_link, compilingContext)];
    }
    if (Array.isArray(description.__any_of)) {
      return [compileList(description.__any_of, compilingContext)];
    }
    if (Array.isArray(description.__one_of)) {
      return _.flatten(
        _.map(description.__one_of, function (d) {
          return compileDescription(d, compilingContext);
        })
      );
    }
    const obj = compileObject(description, compilingContext);
    if (description.__condition !== undefined) {
      return [compileCondition(description.__condition, obj)];
    }
    return [obj];
  }

  if (_.isString(description) && /^\{.*\}$/.test(description)) {
    return [compileParametrizedValue(description, compilingContext)];
  }

  return [new ConstantComponent(_.isString(description) ? description : String(description))];
}

function compileParametrizedValue(
  value: string,
  compilingContext: CompilingContext,
  template?: unknown
): SharedComponent {
  const normalizedValue = value.substr(1, value.length - 2).toLowerCase();
  const factory = compilingContext.parametrizedComponentFactories.getComponent(
    normalizedValue,
    true
  );
  if (!factory) {
    // eslint-disable-next-line no-console
    console.warn("[Console] no factory found for '" + normalizedValue + "'");
    // using upper case as an indication that this value is a parameter
    return new ConstantComponent(normalizedValue.toUpperCase());
  }
  let component = factory(normalizedValue, undefined, template);
  if (!_.isUndefined(template)) {
    component = wrapComponentWithDefaults(component, { template });
  }
  return component;
}

function compileObject(
  objDescription: Record<string, unknown>,
  compilingContext: CompilingContext
) {
  const objectC = new ConstantComponent('{');
  const constants: SharedComponent[] = [];
  const patterns: SharedComponent[] = [];

  _.each(objDescription, function (desc, key) {
    if (key.indexOf('__') === 0) {
      // meta key
      return;
    }

    const options = getOptions(desc);
    let component: SharedComponent;
    if (/^\{.*\}$/.test(key)) {
      component = compileParametrizedValue(key, compilingContext, options.template);
      patterns.push(component);
    } else if (key === '*') {
      component = new SharedComponent(key);
      patterns.push(component);
    } else {
      options.name = key;
      component = new ConstantComponent(key, undefined, [options]);
      constants.push(component);
    }
    _.each(compileDescription(desc, compilingContext), function (subComponent) {
      component.addComponent(subComponent);
    });
  });

  objectC.addComponent(new ObjectComponent('inner', constants, patterns));
  return objectC;
}

function compileList(listRule: unknown[], compilingContext: CompilingContext) {
  const listC = new ConstantComponent('[');
  _.each(listRule, function (desc) {
    _.each(compileDescription(desc, compilingContext), function (component) {
      listC.addComponent(component);
    });
  });
  return listC;
}

interface LinesEditor {
  getLines: (start: number | null | undefined, end: number) => string[];
  getCurrentPosition: () => { lineNumber: number };
}

const isLinesEditor = (editor: unknown): editor is LinesEditor => {
  if (!isRecord(editor)) {
    return false;
  }
  return typeof editor.getLines === 'function' && typeof editor.getCurrentPosition === 'function';
};

/** takes a compiled object and wraps in a {@link ConditionalProxy } */
function compileCondition(description: unknown, compiledObject: SharedComponent) {
  if (isRecord(description) && _.isString(description.lines_regex)) {
    const linesRegex = description.lines_regex;
    return new ConditionalProxy(function (context: AutoCompleteContext, editor: unknown) {
      if (!isLinesEditor(editor)) {
        return false;
      }

      const startRow = context.requestStartRow;
      const lines = editor.getLines(startRow, editor.getCurrentPosition().lineNumber).join('\n');
      return new RegExp(linesRegex, 'm').test(lines);
    }, compiledObject);
  }

  throw new Error(`unknown condition type - got: ${JSON.stringify(description)}`);
}

// a list of component that match anything but give auto complete suggestions based on global API entries.
export function globalsOnlyAutocompleteComponents(): AutocompleteComponent[] {
  return [new GlobalOnlyComponent('__global__')];
}

/**
 * @param endpointId id of the endpoint being compiled.
 * @param description a json dict describing the endpoint
 * @param endpointComponentResolver a function (endpoint,context,editor) which should resolve an endpoint
 *        to it's list of compiled components.
 * @param parametrizedComponentFactories a dict of the following structure
 * that will be used as a fall back for pattern keys (i.e.: {index}, resolved without the {})
 * {
 *   TYPE: function (part, parent, endpoint) {
 *      return new SharedComponent(part, parent)
 *   }
 * }
 */
export function compileBodyDescription(
  endpointId: string,
  description: unknown,
  parametrizedComponentFactories: ParametrizedComponentFactories
): AutocompleteComponent[] {
  return compileDescription(
    description,
    new CompilingContext(endpointId, parametrizedComponentFactories)
  );
}
