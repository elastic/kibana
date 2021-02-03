/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IDirective, IRootElementService, IScope } from 'angular';

import { I18nServiceType } from './provider';

interface I18nScope extends IScope {
  values?: Record<string, any>;
  defaultMessage: string;
  id: string;
}

const HTML_KEY_PREFIX = 'html_';
const PLACEHOLDER_SEPARATOR = '@I18N@';

export const i18nDirective: [string, string, typeof i18nDirectiveFn] = [
  'i18n',
  '$sanitize',
  i18nDirectiveFn,
];

function i18nDirectiveFn(
  i18n: I18nServiceType,
  $sanitize: (html: string) => string
): IDirective<I18nScope> {
  return {
    restrict: 'A',
    scope: {
      id: '@i18nId',
      defaultMessage: '@i18nDefaultMessage',
      values: '<?i18nValues',
    },
    link($scope, $element) {
      if ($scope.values) {
        $scope.$watchCollection('values', () => {
          setContent($element, $scope, $sanitize, i18n);
        });
      } else {
        setContent($element, $scope, $sanitize, i18n);
      }
    },
  };
}

function setContent(
  $element: IRootElementService,
  $scope: I18nScope,
  $sanitize: (html: string) => string,
  i18n: I18nServiceType
) {
  const originalValues = $scope.values;
  const valuesWithPlaceholders = {} as Record<string, any>;
  let hasValuesWithPlaceholders = false;

  // If we have values with the keys that start with HTML_KEY_PREFIX we should replace
  // them with special placeholders that later on will be inserted as HTML
  // into the DOM, the rest of the content will be treated as text. We don't
  // sanitize values at this stage as some of the values can be excluded from
  // the translated string (e.g. not used by ICU conditional statements).
  if (originalValues) {
    for (const [key, value] of Object.entries(originalValues)) {
      if (key.startsWith(HTML_KEY_PREFIX)) {
        valuesWithPlaceholders[
          key.slice(HTML_KEY_PREFIX.length)
        ] = `${PLACEHOLDER_SEPARATOR}${key}${PLACEHOLDER_SEPARATOR}`;

        hasValuesWithPlaceholders = true;
      } else {
        valuesWithPlaceholders[key] = value;
      }
    }
  }

  const label = i18n($scope.id, {
    values: valuesWithPlaceholders,
    defaultMessage: $scope.defaultMessage,
  });

  // If there are no placeholders to replace treat everything as text, otherwise
  // insert label piece by piece replacing every placeholder with corresponding
  // sanitized HTML content.
  if (!hasValuesWithPlaceholders) {
    $element.text(label);
  } else {
    $element.empty();
    for (const contentOrPlaceholder of label.split(PLACEHOLDER_SEPARATOR)) {
      if (!contentOrPlaceholder) {
        continue;
      }

      $element.append(
        originalValues!.hasOwnProperty(contentOrPlaceholder)
          ? $sanitize(originalValues![contentOrPlaceholder])
          : document.createTextNode(contentOrPlaceholder)
      );
    }
  }
}
