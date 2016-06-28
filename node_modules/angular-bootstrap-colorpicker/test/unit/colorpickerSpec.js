'use strict';

describe('colorpicker module', function () {

  beforeEach(module('colorpicker.module'));

  describe('directive', function () {
    var $scope, $compile, element;

    function compileElement(elementString, scope) {
      element = $compile(elementString)(scope);
      scope.$digest();
      return element;
    }

    beforeEach(inject(function ($rootScope, _$compile_) {
      $scope = $rootScope;
      $compile = _$compile_;
    }));

    afterEach(function() {
      element.remove();
    });


    it('should clean up element from dom', function () {
      var elm = compileElement('<input colorpicker ng-model="picker.color" type="text" value="" />', $scope);
      expect($(document).find('.colorpicker').length).toBe(1);
      elm.remove();
      expect($(document).find('.colorpicker').length).toBe(0);
    });

    it('should change visibility of the picker element', function() {
      var elm = compileElement('<input colorpicker ng-model="picker.color" type="text" value="" />', $scope);
      elm.click();
      expect($(document).find('.colorpicker').hasClass('colorpicker-visible')).toBeTruthy();
      $(document).find('.colorpicker').find('button').trigger('click');
      expect($(document).find('.colorpicker').hasClass('colorpicker-visible')).toBeFalsy();
      elm.click();
      $(document).trigger('mousedown');
      expect($(document).find('.colorpicker').hasClass('colorpicker-visible')).toBeFalsy();
    });

    it('should set a default class name', function() {
      compileElement('<input colorpicker ng-model="picker.color" type="text" value="" />', $scope);
      expect($(document).find('.colorpicker').hasClass('colorpicker-position-bottom')).toBeTruthy();
    });

    it('should set a fixed position', function() {
      compileElement('<input colorpicker colorpicker-fixed-position="true" ng-model="picker.color" type="text" value="" />', $scope);
      expect($(document).find('.colorpicker').hasClass('colorpicker-fixed-position')).toBeTruthy();
    });

    it('should use the body as target', function() {
      compileElement('<input colorpicker ng-model="picker.color" type="text" value="" />', $scope);
      expect($('body > .colorpicker').length > 0).toBeTruthy();
    });

    it('should use the parent element as target', function() {
      var template = $('<div id="foo"><input colorpicker colorpicker-fixed-position="true" colorpicker-parent="true" ng-model="picker.color" type="text" value="" /></div>');
      $('body').append(template);
      compileElement(template.find('input'), $scope);
      expect($('#foo').find('.colorpicker').length > 0).toBeTruthy();
      expect($('body > .colorpicker').length === 0).toBeTruthy();
    });

    it('should update the color preview, when putting a new color in the optional input field', function() {
      compileElement('<input colorpicker colorpicker-with-input="true" colorpicker-fixed-position="true" ng-model="picker.color" type="text" value="" />', $scope);
      var $colorPicker = $('.colorpicker:last');
      var $colorPickerInput = $colorPicker.find('input').val('#ff00ff');
      var $colorPickerPreview = $colorPicker.find('colorpicker-preview');
      $colorPickerInput.trigger('keyup');
      expect($colorPickerPreview.css('background-color')).toBe('rgb(255, 0, 255)');
    });

    it('should display the initial color value if colorpicker-with-input="true"', function() {
      $scope.picker = {
        color: '#BADA55'
      };
      compileElement('<input colorpicker colorpicker-with-input="true" ng-model="picker.color" type="text" value="" />', $scope);
      var $colorPicker = $('.colorpicker:last');
      var $colorPickerInput = $colorPicker.find('input');
      expect($colorPickerInput.val()).toBe('#BADA55');
    });

    it('should update the element, when putting a new color in the optional input field', function() {
      var elm = compileElement('<input colorpicker colorpicker-with-input="true" colorpicker-fixed-position="true" ng-model="picker.color" type="text" value="" />', $scope);
      var $colorPicker = $('.colorpicker:last');
      var $colorPickerInput = $colorPicker.find('input').val('#ff00ff');
      $colorPickerInput.trigger('keyup');
      expect(elm.val()).toBe('#ff00ff');
    });

    it('should update the optional input field, when selecting a new color with the slider', function() {
      var elm = compileElement('<input class="uschi" colorpicker colorpicker-with-input="true" colorpicker-fixed-position="true" ng-model="picker.color" type="text" value="sdf" />', $scope);
      var $colorPicker = $('.colorpicker:last');
      var $colorPickerInput = $colorPicker.find('input');
      elm.val('#333');
      elm.trigger('keyup');
      expect($colorPickerInput.val()).toBe('#333');
    });
  });

  describe('Color', function () {
    var
        Color,
        Helper;

    beforeEach(inject(function (_Color_, _Helper_) {
      Color = _Color_;
      Helper = _Helper_;
    }));

    it('should return color as a rgb string', function () {
      Color.setColor('#ffffff');
      expect(Color.rgb()).toEqual('rgb(255,255,255)');
    });

    it('should return color as a rgba string', function () {
      Color.setColor('#ffffff');
      expect(Color.rgba()).toEqual('rgba(255,255,255,1)');
    });

    it('should return color as a hex string', function () {
      Color.setColor('rgb(255,255,255)');
      expect(Color.hex()).toEqual('#ffffff');
    });

    it('should set hue', function () {
      Color.setHue(0.25);
      expect(Color.value.h).toEqual(0.75);
    });

    it('should set saturation', function () {
      Color.setSaturation(0.25);
      expect(Color.value.s).toEqual(0.25);
    });

    it('should set lightness', function () {
      Color.setLightness(0.25);
      expect(Color.value.b).toEqual(0.75);
    });

    it('should set alpha', function () {
      Color.setAlpha(0.5);
      expect(Color.value.a).toEqual(0.5);
    });

    it('should convert value to hex', function () {
      Color.setColor('rgb(102, 204, 68)');
      expect(Color.toHex()).toEqual('#66cc44');
    });

    it('should convert value to rgb', function () {
      Color.setColor('#66CC44)');
      expect(Color.toRGB()).toEqual({r:102, g:204, b:68, a:1});
    });

  });

  describe('Slider', function () {
    var
        Color,
        Slider;

    beforeEach(inject(function (_Color_, _Slider_) {
      Color = _Color_;
      Slider = _Slider_;
    }));

    it('should return slider object', function () {
      expect(Slider.getSlider()).toEqual({ maxLeft : 0, maxTop : 0, callLeft : null, callTop : null, knob : { top : 0, left : 0 } });
    });

    it('should set knob top and left properties in pixels', function () {
      Slider.setKnob(111, 222);
      expect(Slider.getSlider().knob).toEqual({ top : '111px', left : '222px'});
    });

    it('should set alpha slider properties', function () {
      Slider.setSlider = jasmine.createSpy();
      Slider.setAlpha('foo', 'bar');
      expect(Slider.getSlider()).toEqual({ maxLeft : 0, maxTop : 100, callLeft : false, callTop : 'setAlpha' });
    });

    it('should set hue slider properties', function () {
      Slider.setSlider = jasmine.createSpy();
      Slider.setHue('foo', 'bar');
      expect(Slider.getSlider()).toEqual({ maxLeft : 0, maxTop : 100, callLeft : false, callTop : 'setHue' });
    });

    it('should set saturation slider properties', function () {
      Slider.setSlider = jasmine.createSpy();
      Slider.setSaturation('foo', 'bar');
      expect(Slider.getSlider()).toEqual({ maxLeft : 100, maxTop : 100, callLeft : 'setSaturation', callTop : 'setLightness' });
    });
  });
});
