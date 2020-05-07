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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import $ from 'jquery';
import '../input_focus';

describe('Input focus directive', function() {
  let $compile;
  let $rootScope;
  let $timeout;
  let element;
  let $el;
  let selectedEl;
  let selectedText;
  const inputValue = 'Input Text Value';

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(_$compile_, _$rootScope_, _$timeout_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;

      $el = $('<div>');
      $el.appendTo('body');
    })
  );

  afterEach(function() {
    $el.remove();
    $el = null;
  });

  function renderEl(html) {
    $rootScope.value = inputValue;
    element = $compile(html)($rootScope);
    element.appendTo($el);
    $rootScope.$digest();
    $timeout.flush();
    selectedEl = document.activeElement;
    if (selectedEl.value) {
      selectedText = selectedEl.value.slice(selectedEl.selectionStart, selectedEl.selectionEnd);
    }
  }

  it('should focus the input', function() {
    renderEl('<input type="text" ng-model="value" input-focus />');
    expect(selectedEl).to.equal(element[0]);
    expect(selectedText.length).to.equal(0);
  });

  it('should select the text in the input', function() {
    renderEl('<input type="text" ng-model="value" input-focus="select" />');
    expect(selectedEl).to.equal(element[0]);
    expect(selectedText.length).to.equal(inputValue.length);
    expect(selectedText).to.equal(inputValue);
  });

  it('should not focus the input if disable-input-focus is set to true on the same element', function() {
    renderEl('<input type="text" ng-model="value" input-focus disable-input-focus="true">');
    expect(selectedEl).not.to.be(element[0]);
  });

  it('should still focus the input if disable-input-focus is falsy', function() {
    renderEl('<input type="text" ng-model="value" input-focus disable-input-focus="false">');
    expect(selectedEl).to.be(element[0]);
  });
});
