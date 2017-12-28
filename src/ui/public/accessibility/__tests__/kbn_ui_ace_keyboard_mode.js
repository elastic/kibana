import angular from 'angular';
import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../kbn_ui_ace_keyboard_mode';
import { keyCodes } from '@elastic/eui';

describe('kbnUiAceKeyboardMode directive', () => {
  let element;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(($compile, $rootScope) => {
    element = $compile(`<div ui-ace kbn-ui-ace-keyboard-mode></div>`)($rootScope.$new());
  }));

  it('should add the hint element', () => {
    expect(element.find('.uiAceKeyboardHint').length).to.be(1);
  });

  describe('hint element', () => {
    it('should be tabable', () => {
      expect(element.find('.uiAceKeyboardHint').attr('tabindex')).to.be('0');
    });

    it('should move focus to textbox and be inactive if pressed enter on it', () => {
      const textarea = element.find('textarea');
      sinon.spy(textarea[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.keyCode = keyCodes.ENTER;
      element.find('.uiAceKeyboardHint').trigger(ev);
      expect(textarea[0].focus.called).to.be(true);
      expect(element.find('.uiAceKeyboardHint').hasClass('uiAceKeyboardHint-isInactive')).to.be(true);
    });

    it('should be shown again, when pressing Escape in ace editor', () => {
      const textarea = element.find('textarea');
      const hint = element.find('.uiAceKeyboardHint');
      sinon.spy(hint[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.keyCode = keyCodes.ESCAPE;
      textarea.trigger(ev);
      expect(hint[0].focus.called).to.be(true);
      expect(hint.hasClass('uiAceKeyboardHint-isInactive')).to.be(false);
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

  beforeEach(ngMock.inject(($compile, $rootScope, kbnUiAceKeyboardModeService) => {
    const scope = $rootScope.$new();
    element = $compile(`<div ui-ace></div>`)(scope);
    kbnUiAceKeyboardModeService.initialize(scope, element);
  }));

  it('should add the hint element', () => {
    expect(element.find('.uiAceKeyboardHint').length).to.be(1);
  });

  describe('hint element', () => {
    it('should be tabable', () => {
      expect(element.find('.uiAceKeyboardHint').attr('tabindex')).to.be('0');
    });

    it('should move focus to textbox and be inactive if pressed enter on it', () => {
      const textarea = element.find('textarea');
      sinon.spy(textarea[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.keyCode = keyCodes.ENTER;
      element.find('.uiAceKeyboardHint').trigger(ev);
      expect(textarea[0].focus.called).to.be(true);
      expect(element.find('.uiAceKeyboardHint').hasClass('uiAceKeyboardHint-isInactive')).to.be(true);
    });

    it('should be shown again, when pressing Escape in ace editor', () => {
      const textarea = element.find('textarea');
      const hint = element.find('.uiAceKeyboardHint');
      sinon.spy(hint[0], 'focus');
      const ev = angular.element.Event('keydown'); // eslint-disable-line new-cap
      ev.keyCode = keyCodes.ESCAPE;
      textarea.trigger(ev);
      expect(hint[0].focus.called).to.be(true);
      expect(hint.hasClass('uiAceKeyboardHint-isInactive')).to.be(false);
    });
  });

  describe('ui-ace textarea', () => {
    it('should not be tabable anymore', () => {
      expect(element.find('textarea').attr('tabindex')).to.be('-1');
    });
  });

});
