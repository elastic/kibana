"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _registry = require("./registry");

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
function validateRegistry(registry, elements) {
  it('gets items by lookup property', function () {
    expect(registry.get('__test2')).toEqual(elements[1]());
  });
  it('ignores case when getting items', function () {
    expect(registry.get('__TeSt2')).toEqual(elements[1]());
    expect(registry.get('__tESt2')).toEqual(elements[1]());
  });
  it('gets a shallow clone', function () {
    expect(registry.get('__test2')).not.toBe(elements[1]());
  });
  it('is null with no match', function () {
    expect(registry.get('@@nope_nope')).toBe(null);
  });
  it('returns shallow clone of the whole registry via toJS', function () {
    var regAsJs = registry.toJS();
    expect(regAsJs).toEqual({
      __test1: elements[0](),
      __test2: elements[1]()
    });
    expect(regAsJs.__test1).toEqual(elements[0]());
    expect(regAsJs.__test1).not.toBe(elements[0]());
  });
  it('returns shallow clone array via toArray', function () {
    var regAsArray = registry.toArray();
    expect(regAsArray).toBeInstanceOf(Array);
    expect(regAsArray[0]).toEqual(elements[0]());
    expect(regAsArray[0]).not.toBe(elements[0]());
  });
  it('resets the registry', function () {
    expect(registry.get('__test2')).toEqual(elements[1]());
    registry.reset();
    expect(registry.get('__test2')).toBe(null);
  });
}

describe('Registry', function () {
  describe('name registry', function () {
    var elements = [function () {
      return {
        name: '__test1',
        prop1: 'some value'
      };
    }, function () {
      return {
        name: '__test2',
        prop2: 'some other value',
        type: 'unused'
      };
    }];
    var registry = new _registry.Registry();
    registry.register(elements[0]);
    registry.register(elements[1]);
    validateRegistry(registry, elements);
    it('has a prop of name', function () {
      expect(registry.getProp()).toBe('name');
    });
    it('throws when object is missing the lookup prop', function () {
      var check = function check() {
        return registry.register(function () {
          return {
            hello: 'world'
          };
        });
      };

      expect(check).toThrowError(/object with a name property/);
    });
  });
  describe('type registry', function () {
    var elements = [function () {
      return {
        type: '__test1',
        prop1: 'some value'
      };
    }, function () {
      return {
        type: '__test2',
        prop2: 'some other value',
        name: 'unused'
      };
    }];
    var registry = new _registry.Registry('type');
    registry.register(elements[0]);
    registry.register(elements[1]);
    validateRegistry(registry, elements);
    it('has a prop of type', function () {
      expect(registry.getProp()).toBe('type');
    });
    it('throws when object is missing the lookup prop', function () {
      var check = function check() {
        return registry.register(function () {
          return {
            hello: 'world'
          };
        });
      };

      expect(check).toThrowError(/object with a type property/);
    });
  });
  describe('wrapped registry', function () {
    var idx = 0;
    var elements = [function () {
      return {
        name: '__test1',
        prop1: 'some value'
      };
    }, function () {
      return {
        name: '__test2',
        prop2: 'some other value',
        type: 'unused'
      };
    }];

    var CustomRegistry =
    /*#__PURE__*/
    function (_Registry) {
      (0, _inherits2.default)(CustomRegistry, _Registry);

      function CustomRegistry() {
        (0, _classCallCheck2.default)(this, CustomRegistry);
        return (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(CustomRegistry).apply(this, arguments));
      }

      (0, _createClass2.default)(CustomRegistry, [{
        key: "wrapper",
        value: function wrapper(obj) {
          // append custom prop to shallow cloned object, with index as a value
          return (0, _objectSpread2.default)({}, obj, {
            __CUSTOM_PROP__: idx += 1
          });
        }
      }]);
      return CustomRegistry;
    }(_registry.Registry);

    var registry = new CustomRegistry();
    registry.register(elements[0]);
    registry.register(elements[1]);
    it('contains wrapped elements', function () {
      expect(registry.get(elements[0]().name)).toHaveProperty('__CUSTOM_PROP__');
      expect(registry.get(elements[1]().name)).toHaveProperty('__CUSTOM_PROP__');
    });
  });
  describe('shallow clone full prototype', function () {
    var name = 'test_thing';
    var registry;
    var thing;
    beforeEach(function () {
      registry = new _registry.Registry();

      var Base =
      /*#__PURE__*/
      function () {
        function Base(name) {
          (0, _classCallCheck2.default)(this, Base);
          this.name = name;
        }

        (0, _createClass2.default)(Base, [{
          key: "baseFunc",
          value: function baseFunc() {
            return 'base';
          }
        }]);
        return Base;
      }();

      var Thing =
      /*#__PURE__*/
      function (_Base) {
        (0, _inherits2.default)(Thing, _Base);

        function Thing() {
          (0, _classCallCheck2.default)(this, Thing);
          return (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(Thing).apply(this, arguments));
        }

        (0, _createClass2.default)(Thing, [{
          key: "doThing",
          value: function doThing() {
            return 'done';
          }
        }]);
        return Thing;
      }(Base);

      thing = function thing() {
        return new Thing(name);
      };

      registry.register(thing);
    });
    it('get contains the full prototype', function () {
      expect((0, _typeof2.default)(thing().baseFunc)).toBe('function');
      expect((0, _typeof2.default)(registry.get(name).baseFunc)).toBe('function');
    });
    it('toJS contains the full prototype', function () {
      var val = registry.toJS();
      expect((0, _typeof2.default)(val[name].baseFunc)).toBe('function');
    });
  });
  describe('throws when lookup prop is not a string', function () {
    var check = function check() {
      return new _registry.Registry(2);
    };

    expect(check).toThrowError(/must be a string/);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL3JlZ2lzdHJ5LnRlc3QuanMiXSwibmFtZXMiOlsidmFsaWRhdGVSZWdpc3RyeSIsInJlZ2lzdHJ5IiwiZWxlbWVudHMiLCJpdCIsImV4cGVjdCIsImdldCIsInRvRXF1YWwiLCJub3QiLCJ0b0JlIiwicmVnQXNKcyIsInRvSlMiLCJfX3Rlc3QxIiwiX190ZXN0MiIsInJlZ0FzQXJyYXkiLCJ0b0FycmF5IiwidG9CZUluc3RhbmNlT2YiLCJBcnJheSIsInJlc2V0IiwiZGVzY3JpYmUiLCJuYW1lIiwicHJvcDEiLCJwcm9wMiIsInR5cGUiLCJSZWdpc3RyeSIsInJlZ2lzdGVyIiwiZ2V0UHJvcCIsImNoZWNrIiwiaGVsbG8iLCJ0b1Rocm93RXJyb3IiLCJpZHgiLCJDdXN0b21SZWdpc3RyeSIsIm9iaiIsIl9fQ1VTVE9NX1BST1BfXyIsInRvSGF2ZVByb3BlcnR5IiwidGhpbmciLCJiZWZvcmVFYWNoIiwiQmFzZSIsIlRoaW5nIiwiYmFzZUZ1bmMiLCJ2YWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW1CQTs7QUFuQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXFCQSxTQUFTQSxnQkFBVCxDQUEwQkMsUUFBMUIsRUFBb0NDLFFBQXBDLEVBQThDO0FBQzVDQyxFQUFBQSxFQUFFLENBQUMsK0JBQUQsRUFBa0MsWUFBTTtBQUN4Q0MsSUFBQUEsTUFBTSxDQUFDSCxRQUFRLENBQUNJLEdBQVQsQ0FBYSxTQUFiLENBQUQsQ0FBTixDQUFnQ0MsT0FBaEMsQ0FBd0NKLFFBQVEsQ0FBQyxDQUFELENBQVIsRUFBeEM7QUFDRCxHQUZDLENBQUY7QUFJQUMsRUFBQUEsRUFBRSxDQUFDLGlDQUFELEVBQW9DLFlBQU07QUFDMUNDLElBQUFBLE1BQU0sQ0FBQ0gsUUFBUSxDQUFDSSxHQUFULENBQWEsU0FBYixDQUFELENBQU4sQ0FBZ0NDLE9BQWhDLENBQXdDSixRQUFRLENBQUMsQ0FBRCxDQUFSLEVBQXhDO0FBQ0FFLElB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QUEyQixrQkFBM0I7QUFDRCxHQUhPLENBQVI7QUFJRCxDQXZJTyxDQUFSIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIExpY2Vuc2VkIHRvIEVsYXN0aWNzZWFyY2ggQi5WLiB1bmRlciBvbmUgb3IgbW9yZSBjb250cmlidXRvclxuICogbGljZW5zZSBhZ3JlZW1lbnRzLiBTZWUgdGhlIE5PVElDRSBmaWxlIGRpc3RyaWJ1dGVkIHdpdGhcbiAqIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiByZWdhcmRpbmcgY29weXJpZ2h0XG4gKiBvd25lcnNoaXAuIEVsYXN0aWNzZWFyY2ggQi5WLiBsaWNlbnNlcyB0aGlzIGZpbGUgdG8geW91IHVuZGVyXG4gKiB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5XG4gKiBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuICogc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbiAqIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4gKiBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbiAqIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbiAqIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7IFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeSc7XG5cbmZ1bmN0aW9uIHZhbGlkYXRlUmVnaXN0cnkocmVnaXN0cnksIGVsZW1lbnRzKSB7XG4gIGl0KCdnZXRzIGl0ZW1zIGJ5IGxvb2t1cCBwcm9wZXJ0eScsICgpID0+IHtcbiAgICBleHBlY3QocmVnaXN0cnkuZ2V0KCdfX3Rlc3QyJykpLnRvRXF1YWwoZWxlbWVudHNbMV0oKSk7XG4gIH0pO1xuXG4gIGl0KCdpZ25vcmVzIGNhc2Ugd2hlbiBnZXR0aW5nIGl0ZW1zJywgKCkgPT4ge1xuICAgIGV4cGVjdChyZWdpc3RyeS5nZXQoJ19fVGVTdDInKSkudG9FcXVhbChlbGVtZW50c1sxXSgpKTtcbiAgICBleHBlY3QocmVnaXN0cnkuZ2V0KCdfX3RFU3QyJykpLnRvRXF1YWwoZWxlbWVudHNbMV0oKSk7XG4gIH0pO1xuXG4gIGl0KCdnZXRzIGEgc2hhbGxvdyBjbG9uZScsICgpID0+IHtcbiAgICBleHBlY3QocmVnaXN0cnkuZ2V0KCdfX3Rlc3QyJykpLm5vdC50b0JlKGVsZW1lbnRzWzFdKCkpO1xuICB9KTtcblxuICBpdCgnaXMgbnVsbCB3aXRoIG5vIG1hdGNoJywgKCkgPT4ge1xuICAgIGV4cGVjdChyZWdpc3RyeS5nZXQoJ0BAbm9wZV9ub3BlJykpLnRvQmUobnVsbCk7XG4gIH0pO1xuXG4gIGl0KCdyZXR1cm5zIHNoYWxsb3cgY2xvbmUgb2YgdGhlIHdob2xlIHJlZ2lzdHJ5IHZpYSB0b0pTJywgKCkgPT4ge1xuICAgIGNvbnN0IHJlZ0FzSnMgPSByZWdpc3RyeS50b0pTKCk7XG4gICAgZXhwZWN0KHJlZ0FzSnMpLnRvRXF1YWwoe1xuICAgICAgX190ZXN0MTogZWxlbWVudHNbMF0oKSxcbiAgICAgIF9fdGVzdDI6IGVsZW1lbnRzWzFdKCksXG4gICAgfSk7XG4gICAgZXhwZWN0KHJlZ0FzSnMuX190ZXN0MSkudG9FcXVhbChlbGVtZW50c1swXSgpKTtcbiAgICBleHBlY3QocmVnQXNKcy5fX3Rlc3QxKS5ub3QudG9CZShlbGVtZW50c1swXSgpKTtcbiAgfSk7XG5cbiAgaXQoJ3JldHVybnMgc2hhbGxvdyBjbG9uZSBhcnJheSB2aWEgdG9BcnJheScsICgpID0+IHtcbiAgICBjb25zdCByZWdBc0FycmF5ID0gcmVnaXN0cnkudG9BcnJheSgpO1xuICAgIGV4cGVjdChyZWdBc0FycmF5KS50b0JlSW5zdGFuY2VPZihBcnJheSk7XG4gICAgZXhwZWN0KHJlZ0FzQXJyYXlbMF0pLnRvRXF1YWwoZWxlbWVudHNbMF0oKSk7XG4gICAgZXhwZWN0KHJlZ0FzQXJyYXlbMF0pLm5vdC50b0JlKGVsZW1lbnRzWzBdKCkpO1xuICB9KTtcblxuICBpdCgncmVzZXRzIHRoZSByZWdpc3RyeScsICgpID0+IHtcbiAgICBleHBlY3QocmVnaXN0cnkuZ2V0KCdfX3Rlc3QyJykpLnRvRXF1YWwoZWxlbWVudHNbMV0oKSk7XG4gICAgcmVnaXN0cnkucmVzZXQoKTtcbiAgICBleHBlY3QocmVnaXN0cnkuZ2V0KCdfX3Rlc3QyJykpLnRvQmUobnVsbCk7XG4gIH0pO1xufVxuXG5kZXNjcmliZSgnUmVnaXN0cnknLCAoKSA9PiB7XG4gIGRlc2NyaWJlKCduYW1lIHJlZ2lzdHJ5JywgKCkgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW1xuICAgICAgKCkgPT4gKHtcbiAgICAgICAgbmFtZTogJ19fdGVzdDEnLFxuICAgICAgICBwcm9wMTogJ3NvbWUgdmFsdWUnLFxuICAgICAgfSksXG4gICAgICAoKSA9PiAoe1xuICAgICAgICBuYW1lOiAnX190ZXN0MicsXG4gICAgICAgIHByb3AyOiAnc29tZSBvdGhlciB2YWx1ZScsXG4gICAgICAgIHR5cGU6ICd1bnVzZWQnLFxuICAgICAgfSksXG4gICAgXTtcblxuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IFJlZ2lzdHJ5KCk7XG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZWxlbWVudHNbMF0pO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKGVsZW1lbnRzWzFdKTtcblxuICAgIHZhbGlkYXRlUmVnaXN0cnkocmVnaXN0cnksIGVsZW1lbnRzKTtcblxuICAgIGl0KCdoYXMgYSBwcm9wIG9mIG5hbWUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QocmVnaXN0cnkuZ2V0UHJvcCgpKS50b0JlKCduYW1lJyk7XG4gICAgfSk7XG5cbiAgICBpdCgndGhyb3dzIHdoZW4gb2JqZWN0IGlzIG1pc3NpbmcgdGhlIGxvb2t1cCBwcm9wJywgKCkgPT4ge1xuICAgICAgY29uc3QgY2hlY2sgPSAoKSA9PiByZWdpc3RyeS5yZWdpc3RlcigoKSA9PiAoeyBoZWxsbzogJ3dvcmxkJyB9KSk7XG4gICAgICBleHBlY3QoY2hlY2spLnRvVGhyb3dFcnJvcigvb2JqZWN0IHdpdGggYSBuYW1lIHByb3BlcnR5Lyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd0eXBlIHJlZ2lzdHJ5JywgKCkgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW1xuICAgICAgKCkgPT4gKHtcbiAgICAgICAgdHlwZTogJ19fdGVzdDEnLFxuICAgICAgICBwcm9wMTogJ3NvbWUgdmFsdWUnLFxuICAgICAgfSksXG4gICAgICAoKSA9PiAoe1xuICAgICAgICB0eXBlOiAnX190ZXN0MicsXG4gICAgICAgIHByb3AyOiAnc29tZSBvdGhlciB2YWx1ZScsXG4gICAgICAgIG5hbWU6ICd1bnVzZWQnLFxuICAgICAgfSksXG4gICAgXTtcblxuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IFJlZ2lzdHJ5KCd0eXBlJyk7XG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZWxlbWVudHNbMF0pO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKGVsZW1lbnRzWzFdKTtcblxuICAgIHZhbGlkYXRlUmVnaXN0cnkocmVnaXN0cnksIGVsZW1lbnRzKTtcblxuICAgIGl0KCdoYXMgYSBwcm9wIG9mIHR5cGUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QocmVnaXN0cnkuZ2V0UHJvcCgpKS50b0JlKCd0eXBlJyk7XG4gICAgfSk7XG5cbiAgICBpdCgndGhyb3dzIHdoZW4gb2JqZWN0IGlzIG1pc3NpbmcgdGhlIGxvb2t1cCBwcm9wJywgKCkgPT4ge1xuICAgICAgY29uc3QgY2hlY2sgPSAoKSA9PiByZWdpc3RyeS5yZWdpc3RlcigoKSA9PiAoeyBoZWxsbzogJ3dvcmxkJyB9KSk7XG4gICAgICBleHBlY3QoY2hlY2spLnRvVGhyb3dFcnJvcigvb2JqZWN0IHdpdGggYSB0eXBlIHByb3BlcnR5Lyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd3cmFwcGVkIHJlZ2lzdHJ5JywgKCkgPT4ge1xuICAgIGxldCBpZHggPSAwO1xuICAgIGNvbnN0IGVsZW1lbnRzID0gW1xuICAgICAgKCkgPT4gKHtcbiAgICAgICAgbmFtZTogJ19fdGVzdDEnLFxuICAgICAgICBwcm9wMTogJ3NvbWUgdmFsdWUnLFxuICAgICAgfSksXG4gICAgICAoKSA9PiAoe1xuICAgICAgICBuYW1lOiAnX190ZXN0MicsXG4gICAgICAgIHByb3AyOiAnc29tZSBvdGhlciB2YWx1ZScsXG4gICAgICAgIHR5cGU6ICd1bnVzZWQnLFxuICAgICAgfSksXG4gICAgXTtcblxuICAgIGNsYXNzIEN1c3RvbVJlZ2lzdHJ5IGV4dGVuZHMgUmVnaXN0cnkge1xuICAgICAgd3JhcHBlcihvYmopIHtcbiAgICAgICAgLy8gYXBwZW5kIGN1c3RvbSBwcm9wIHRvIHNoYWxsb3cgY2xvbmVkIG9iamVjdCwgd2l0aCBpbmRleCBhcyBhIHZhbHVlXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgLi4ub2JqLFxuICAgICAgICAgIF9fQ1VTVE9NX1BST1BfXzogKGlkeCArPSAxKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBDdXN0b21SZWdpc3RyeSgpO1xuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKGVsZW1lbnRzWzBdKTtcbiAgICByZWdpc3RyeS5yZWdpc3RlcihlbGVtZW50c1sxXSk7XG5cbiAgICBpdCgnY29udGFpbnMgd3JhcHBlZCBlbGVtZW50cycsICgpID0+IHtcbiAgICAgIGV4cGVjdChyZWdpc3RyeS5nZXQoZWxlbWVudHNbMF0oKS5uYW1lKSkudG9IYXZlUHJvcGVydHkoJ19fQ1VTVE9NX1BST1BfXycpO1xuICAgICAgZXhwZWN0KHJlZ2lzdHJ5LmdldChlbGVtZW50c1sxXSgpLm5hbWUpKS50b0hhdmVQcm9wZXJ0eSgnX19DVVNUT01fUFJPUF9fJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzaGFsbG93IGNsb25lIGZ1bGwgcHJvdG90eXBlJywgKCkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSAndGVzdF90aGluZyc7XG4gICAgbGV0IHJlZ2lzdHJ5O1xuICAgIGxldCB0aGluZztcblxuICAgIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgICAgcmVnaXN0cnkgPSBuZXcgUmVnaXN0cnkoKTtcbiAgICAgIGNsYXNzIEJhc2Uge1xuICAgICAgICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJhc2VGdW5jKCkge1xuICAgICAgICAgIHJldHVybiAnYmFzZSc7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY2xhc3MgVGhpbmcgZXh0ZW5kcyBCYXNlIHtcbiAgICAgICAgZG9UaGluZygpIHtcbiAgICAgICAgICByZXR1cm4gJ2RvbmUnO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaW5nID0gKCkgPT4gbmV3IFRoaW5nKG5hbWUpO1xuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIodGhpbmcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2dldCBjb250YWlucyB0aGUgZnVsbCBwcm90b3R5cGUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodHlwZW9mIHRoaW5nKCkuYmFzZUZ1bmMpLnRvQmUoJ2Z1bmN0aW9uJyk7XG4gICAgICBleHBlY3QodHlwZW9mIHJlZ2lzdHJ5LmdldChuYW1lKS5iYXNlRnVuYykudG9CZSgnZnVuY3Rpb24nKTtcbiAgICB9KTtcblxuICAgIGl0KCd0b0pTIGNvbnRhaW5zIHRoZSBmdWxsIHByb3RvdHlwZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbCA9IHJlZ2lzdHJ5LnRvSlMoKTtcbiAgICAgIGV4cGVjdCh0eXBlb2YgdmFsW25hbWVdLmJhc2VGdW5jKS50b0JlKCdmdW5jdGlvbicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndGhyb3dzIHdoZW4gbG9va3VwIHByb3AgaXMgbm90IGEgc3RyaW5nJywgKCkgPT4ge1xuICAgIGNvbnN0IGNoZWNrID0gKCkgPT4gbmV3IFJlZ2lzdHJ5KDIpO1xuICAgIGV4cGVjdChjaGVjaykudG9UaHJvd0Vycm9yKC9tdXN0IGJlIGEgc3RyaW5nLyk7XG4gIH0pO1xufSk7XG4iXX0=