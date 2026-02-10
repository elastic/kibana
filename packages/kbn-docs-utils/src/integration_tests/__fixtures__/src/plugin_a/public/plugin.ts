/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The logic for grabbing Setup and Start types relies on implementing an
// interface with at least two type args. Since the test code isn't adding
// every import file, use this mock, otherwise it won't have the type and will
// fail.
interface PluginMock<Sp, St> {
  setup(): Sp;
  start(): St;
}

/**
 * The SearchSpec interface contains settings for creating a new SearchService, like
 * username and password.
 */
export interface SearchSpec {
  /**
   * Stores the username. Duh,
   */
  username: string;
  /**
   * Stores the password. I hope it's encrypted!
   */
  password: string;
}

/**
 * The type of search language.
 */
export enum SearchLanguage {
  /**
   * The SQL SearchLanguage type
   */
  SQL,
  /**
   * The EQL SearchLanguage type. Support sequences.
   */
  EQL,
  /**
   * The ES DSL SearchLanguage type. It's the default.
   */
  ES_DSL,
}

/**
 * Access start functionality from your plugin's start function by adding the example
 * plugin as a dependency.
 *
 * ```ts
 * Class MyPlugin {
 *   start(core: CoreDependencies, { example }: PluginDependencies) {
 *     // Here you can access this functionality.
 *     example.getSearchLanguage();
 *   }
 * }
 * ```
 */
export interface Start {
  /**
   * @returns The currently selected {@link SearchLanguage}
   */
  getSearchLanguage: () => SearchLanguage;

  /**
   * @internal
   */
  anInternalStartFn: () => string;
}

/**
 * Access setup functionality from your plugin's setup function by adding the example
 * plugin as a dependency.
 *
 * ```ts
 * Class MyPlugin {
 *   setup(core: CoreDependencies, { example }: PluginDependencies) {
 *     // Here you can access this functionality.
 *     example.getSearchService();
 *   }
 * }
 * ```
 */
export interface Setup {
  /**
   * A factory function that returns a new instance of Foo based
   * on the spec. We aren't sure if this is a good function so it's marked
   * beta. That should be clear in the docs because of the js doc tag.
   *
   * @param searchSpec Provide the settings neccessary to create a new Search Service
   *
   * @returns the id of the search service.
   *
   * @beta
   */
  getSearchService: (searchSpec: SearchSpec) => string;

  /**
   * This uses an inlined object type rather than referencing an exported type, which is discouraged.
   * prefer the way {@link getSearchService} is typed.
   *
   * @param searchSpec Provide the settings neccessary to create a new Search Service
   */
  getSearchService2: (searchSpec: { username: string; password: string }) => string;

  /**
   * This function does the thing and it's so good at it!  But we decided to deprecate it
   * anyway. I hope that's clear to developers in the docs!
   *
   * @param thingOne Thing one comment
   * @param thingTwo ThingTwo comment
   * @param thingThree Thing three is an object with a nested var
   *
   * @deprecated
   *
   */
  doTheThing: (thingOne: number, thingTwo: string, thingThree: { nestedVar: number }) => void;

  /**
   * Who would write such a complicated function?? Ew, how will the obj parameter appear in docs?
   *
   * @param obj A funky parameter.
   *
   * @returns It's hard to tell but I think this returns a function that returns an object with a
   * property that is a function that returns a string. Whoa.
   *
   */
  fnWithInlineParams: (obj: {
    fn: (foo: { param: string }) => number;
  }) => () => { retFoo: () => string };

  /**
   * Hi, I'm a comment for an id string!
   */
  id: string;
}

/**
 * This comment won't show up in the API docs.
 */
function getSearchService() {
  return 'hi';
}

function fnWithInlineParams() {
  return () => ({
    retFoo: () => 'hi',
  });
}

/**
 * The example search plugin is a fake plugin that is built only to test our api documentation system.
 *
 */
export class PluginA implements PluginMock<Setup, Start> {
  setup() {
    return {
      // Don't put comments here - they won't show up. What's here shouldn't matter because
      // the API documentation system works off the type `Setup`.
      doTheThing: () => {},
      fnWithInlineParams,
      getSearchService,
      getSearchService2: getSearchService,
      registerSearch: () => {},
      id: '123',
    };
  }

  start() {
    return { getSearchLanguage: () => SearchLanguage.EQL, anInternalStartFn: () => 'ho' };
  }
}

// Expected issues:
//   missing comments (10):
//     line 66 - getSearchLanguage
//     line 110 - password
//     line 110 - searchSpec
//     line 110 - username
//     line 123 - nestedVar
//     line 123 - thingThree
//     line 134 - obj
//     line 135 - fn
//     line 135 - foo
//     line 135 - param
//   no references (23):
//     line 19 - SearchSpec
//     line 24 - username
//     line 28 - password
//     line 52 - Start
//     line 66 - getSearchLanguage
//     line 77 - Setup
//     line 91 - getSearchService
//     line 102 - searchSpec
//     line 104 - getSearchService2
//     line 110 - password
//     line 110 - searchSpec
//     line 110 - username
//     line 112 - doTheThing
//     line 123 - nestedVar
//     line 123 - thingOne
//     line 123 - thingThree
//     line 123 - thingTwo
//     line 125 - fnWithInlineParams
//     line 134 - obj
//     line 135 - fn
//     line 135 - foo
//     line 135 - param
//     line 138 - id
