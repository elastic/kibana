/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import { template } from 'lodash';
import '../filters/short_dots';
import booleanFieldNameIcon from './field_name_icons/boolean_field_name_icon.html';
import conflictFieldNameIcon from './field_name_icons/conflict_field_name_icon.html';
import dateFieldNameIcon from './field_name_icons/date_field_name_icon.html';
import geoPointFieldNameIcon from './field_name_icons/geo_point_field_name_icon.html';
import ipFieldNameIcon from './field_name_icons/ip_field_name_icon.html';
import murmur3FieldNameIcon from './field_name_icons/murmur3_field_name_icon.html';
import numberFieldNameIcon from './field_name_icons/number_field_name_icon.html';
import sourceFieldNameIcon from './field_name_icons/source_field_name_icon.html';
import stringFieldNameIcon from './field_name_icons/string_field_name_icon.html';
import unknownFieldNameIcon from './field_name_icons/unknown_field_name_icon.html';

import { uiModules } from '../modules';
const module = uiModules.get('kibana');

const compiledBooleanFieldNameIcon = template(booleanFieldNameIcon);
const compiledConflictFieldNameIcon = template(conflictFieldNameIcon);
const compiledDateFieldNameIcon = template(dateFieldNameIcon);
const compiledGeoPointFieldNameIcon = template(geoPointFieldNameIcon);
const compiledIpFieldNameIcon = template(ipFieldNameIcon);
const compiledMurmur3FieldNameIcon = template(murmur3FieldNameIcon);
const compiledNumberFieldNameIcon = template(numberFieldNameIcon);
const compiledSourceFieldNameIcon = template(sourceFieldNameIcon);
const compiledStringFieldNameIcon = template(stringFieldNameIcon);
const compiledUnknownFieldNameIcon = template(unknownFieldNameIcon);

module.directive('fieldName', function ($compile, $rootScope, $filter, i18n) {
  return {
    restrict: 'AE',
    scope: {
      'field': '=',
      'fieldName': '=',
      'fieldType': '='
    },
    link: function ($scope, $el) {
      const typeToIconMap = {
        boolean: compiledBooleanFieldNameIcon({
          booleanFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.booleanAriaLabel', {
            defaultMessage: 'Boolean field'
          }),
        }),
        conflict: compiledConflictFieldNameIcon({
          conflictingFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.conflictFieldAriaLabel', {
            defaultMessage: 'Conflicting field'
          }),
        }),
        date: compiledDateFieldNameIcon({
          dateFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.dateFieldAriaLabel', {
            defaultMessage: 'Date field'
          }),
        }),
        geo_point: compiledGeoPointFieldNameIcon({
          geoPointFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.geoPointFieldAriaLabel', {
            defaultMessage: 'Date field'
          }),
        }),
        ip: compiledIpFieldNameIcon({
          ipAddressFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.ipAddressFieldAriaLabel', {
            defaultMessage: 'IP address field'
          }),
        }),
        murmur3: compiledMurmur3FieldNameIcon({
          murmur3FieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.murmur3FieldAriaLabel', {
            defaultMessage: 'Murmur3 field'
          }),
        }),
        number: compiledNumberFieldNameIcon({
          numberFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.numberFieldAriaLabel', {
            defaultMessage: 'Number field'
          }),
        }),
        source: compiledSourceFieldNameIcon({
          sourceFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.sourceFieldAriaLabel', {
            defaultMessage: 'Source field'
          }),
        }),
        string: compiledStringFieldNameIcon({
          stringFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.stringFieldAriaLabel', {
            defaultMessage: 'String field'
          }),
        }),
      };

      function typeIcon(fieldType) {
        if (typeToIconMap.hasOwnProperty(fieldType)) {
          return typeToIconMap[fieldType];
        }

        return compiledUnknownFieldNameIcon({
          unknownFieldAriaLabel: i18n('common.ui.directives.fieldNameIcons.unknownFieldAriaLabel', {
            defaultMessage: 'Unknown field'
          }),
        });
      }

      $rootScope.$watchMulti.call($scope, [
        'field',
        'fieldName',
        'fieldType',
        'field.rowCount'
      ], function () {

        const type = $scope.field ? $scope.field.type : $scope.fieldType;
        const name = $scope.field ? $scope.field.name : $scope.fieldName;
        const results = $scope.field ? !$scope.field.rowCount && !$scope.field.scripted : false;
        const scripted = $scope.field ? $scope.field.scripted : false;

        const displayName = $filter('shortDots')(name);

        $el
          .attr('title', name)
          .toggleClass('dscField--noResults', results)
          .toggleClass('scripted', scripted)
          .prepend(typeIcon(type))
          .append($('<span>')
            .text(displayName)
            .addClass('dscFieldName')
          );
      });
    }
  };
});
