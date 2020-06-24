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

import angular from 'angular';
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../kbn_ui_ace_keyboard_mode';
import { keys } from '@elastic/eui';

describe('kbnUiAceKeyboardMode directive', () => {
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject(($compile, $rootScope) => {
      element = $compile(`<div ui-ace kbn-ui-ace-keyboard-mode></div>`)($rootScope.$new());
    })
  );

  it('should add the hint element', () => {
    expect(element.find('.kbnUiAceKeyboardHint').length).to.be(1);
  });

  describe('hint element', () => {
    it('should be tabable', () => {
      expect(element.find('.kbnUiAceKeyboardHint').attr('tabindex')).to.be('0');
    });

    it('should move focus to textbox and be inactive if pressed enter on it', () => {
      const textarea = element.find('textarea');
      sinon.spy(textarea[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.key = keys.ENTER;
      element.find('.kbnUiAceKeyboardHint').trigger(ev);
      expect(textarea[0].focus.called).to.be(true);
      expect(
        element.find('.kbnUiAceKeyboardHint').hasClass('kbnUiAceKeyboardHint-isInactive')
      ).to.be(true);
    });

    it('should be shown again, when pressing Escape in ace editor', () => {
      const textarea = element.find('textarea');
      const hint = element.find('.kbnUiAceKeyboardHint');
      sinon.spy(hint[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.key = keys.ESCAPE;
      textarea.trigger(ev);
      expect(hint[0].focus.called).to.be(true);
      expect(hint.hasClass('kbnUiAceKeyboardHint-isInactive')).to.be(false);
    });
  });

  describe('ui-ace textarea', () => {
    it('should not be tabable anymore', () => {
      expect(element.find('textarea').attr('tabindex')).to.be('-1');
    });
  });
});

describe('kbnUiAceKeyboardModeService', () => {
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(
    ngMock.inject(($compile, $rootScope, kbnUiAceKeyboardModeService) => {
      const scope = $rootScope.$new();
      element = $compile(`<div ui-ace></div>`)(scope);
      kbnUiAceKeyboardModeService.initialize(scope, element);
    })
  );

  it('should add the hint element', () => {
    expect(element.find('.kbnUiAceKeyboardHint').length).to.be(1);
  });

  describe('hint element', () => {
    it('should be tabable', () => {
      expect(element.find('.kbnUiAceKeyboardHint').attr('tabindex')).to.be('0');
    });

    it('should move focus to textbox and be inactive if pressed enter on it', () => {
      const textarea = element.find('textarea');
      sinon.spy(textarea[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.key = keys.ENTER;
      element.find('.kbnUiAceKeyboardHint').trigger(ev);
      expect(textarea[0].focus.called).to.be(true);
      expect(
        element.find('.kbnUiAceKeyboardHint').hasClass('kbnUiAceKeyboardHint-isInactive')
      ).to.be(true);
    });

    it('should be shown again, when pressing Escape in ace editor', () => {
      const textarea = element.find('textarea');
      const hint = element.find('.kbnUiAceKeyboardHint');
      sinon.spy(hint[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.key = keys.ESCAPE;
      textarea.trigger(ev);
      expect(hint[0].focus.called).to.be(true);
      expect(hint.hasClass('kbnUiAceKeyboardHint-isInactive')).to.be(false);
    });
  });

  describe('ui-ace textarea', () => {
    it('should not be tabable anymore', () => {
      expect(element.find('textarea').attr('tabindex')).to.be('-1');
    });
  });
});
