/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import angular from 'angular';
import 'angular-mocks';
import 'angular-sanitize';

import { i18nDirective } from './directive';
import { I18nProvider } from './provider';

angular
  .module('app', ['ngSanitize'])
  .provider('i18n', I18nProvider)
  .directive('i18nId', i18nDirective);

describe('i18nDirective', () => {
  let compile: angular.ICompileService;
  let scope: angular.IRootScopeService & { word?: string };

  beforeEach(angular.mock.module('app'));
  beforeEach(
    angular.mock.inject(
      ($compile: angular.ICompileService, $rootScope: angular.IRootScopeService) => {
        compile = $compile;
        scope = $rootScope.$new();
        scope.word = 'word';
      }
    )
  );

  test('inserts correct translation html content', () => {
    const id = 'id';
    const defaultMessage = 'default-message';

    const element = angular.element(
      `<div
        i18n-id="${id}"
        i18n-default-message="${defaultMessage}"
      />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element.html()).toEqual(defaultMessage);
  });

  test('inserts correct translation html content with values', () => {
    const id = 'id';
    const defaultMessage = 'default-message {word}';

    const element = angular.element(
      `<div
        i18n-id="${id}"
        i18n-default-message="${defaultMessage}"
        i18n-values="{ word }"
      />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element.html()).toMatchSnapshot();

    scope.word = 'anotherWord';
    scope.$digest();

    expect(element.html()).toMatchSnapshot();
  });

  test('sanitizes message before inserting it to DOM', () => {
    const element = angular.element(
      `<div
        i18n-id="id"
        i18n-default-message="Default message, {value}"
        i18n-values="{ html_value: '<div ng-click=&quot;dangerousAction()&quot;></div>' }"
       />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element[0]).toMatchSnapshot();
  });

  test(`doesn't render html in result message with text-only values`, () => {
    const element = angular.element(
      `<div
        i18n-id="id"
        i18n-default-message="Default {one} onclick=alert(1) {two} message"
        i18n-values="{ one: '<span', two: '>Press</span>' }"
       />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element[0]).toMatchSnapshot();
  });

  test('sanitizes onclick attribute', () => {
    const element = angular.element(
      `<div
        i18n-id="id"
        i18n-default-message="Default {value} message"
        i18n-values="{ html_value: '<span onclick=alert(1)>Press</span>' }"
       />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element[0]).toMatchSnapshot();
  });

  test('sanitizes onmouseover attribute', () => {
    const element = angular.element(
      `<div
        i18n-id="id"
        i18n-default-message="Default {value} message"
        i18n-values="{ html_value: '<span onmouseover=&quot;alert(1)&quot;>Press</span>' }"
       />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element[0]).toMatchSnapshot();
  });

  test(`doesn't render html in text-only value`, () => {
    const element = angular.element(
      `<div
        i18n-id="id"
        i18n-default-message="Default {value}"
        i18n-values="{ value: '<strong>message</strong>' }"
       />`
    );

    compile(element)(scope);
    scope.$digest();

    expect(element[0]).toMatchSnapshot();
  });
});
