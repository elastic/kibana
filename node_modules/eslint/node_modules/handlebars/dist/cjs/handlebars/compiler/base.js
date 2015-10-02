'use strict';

exports.__esModule = true;
exports.parse = parse;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _whitespaceControl = require('./whitespace-control');

var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _utils = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_utils.extend(yy, Helpers);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _whitespaceControl2['default'](options);
  return strip.accept(_parser2['default'].parse(input));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O3NCQUFtQixVQUFVOzs7O2lDQUNDLHNCQUFzQjs7Ozt1QkFDM0IsV0FBVzs7SUFBeEIsT0FBTzs7cUJBQ0ksVUFBVTs7UUFFeEIsTUFBTTs7QUFFZixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDWixPQUxTLE1BQU0sQ0FLUixFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7O0FBRWIsU0FBUyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTs7QUFFcEMsTUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUFFLFdBQU8sS0FBSyxDQUFDO0dBQUU7O0FBRS9DLHNCQUFPLEVBQUUsR0FBRyxFQUFFLENBQUM7OztBQUdmLElBQUUsQ0FBQyxPQUFPLEdBQUcsVUFBUyxPQUFPLEVBQUU7QUFDN0IsV0FBTyxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7R0FDbkUsQ0FBQzs7QUFFRixNQUFJLEtBQUssR0FBRyxtQ0FBc0IsT0FBTyxDQUFDLENBQUM7QUFDM0MsU0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQzFDIiwiZmlsZSI6ImxpYi9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcGFyc2VyIGZyb20gJy4vcGFyc2VyJztcbmltcG9ydCBXaGl0ZXNwYWNlQ29udHJvbCBmcm9tICcuL3doaXRlc3BhY2UtY29udHJvbCc7XG5pbXBvcnQgKiBhcyBIZWxwZXJzIGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQgeyBleHRlbmQgfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCB7IHBhcnNlciB9O1xuXG5sZXQgeXkgPSB7fTtcbmV4dGVuZCh5eSwgSGVscGVycyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZShpbnB1dCwgb3B0aW9ucykge1xuICAvLyBKdXN0IHJldHVybiBpZiBhbiBhbHJlYWR5LWNvbXBpbGVkIEFTVCB3YXMgcGFzc2VkIGluLlxuICBpZiAoaW5wdXQudHlwZSA9PT0gJ1Byb2dyYW0nKSB7IHJldHVybiBpbnB1dDsgfVxuXG4gIHBhcnNlci55eSA9IHl5O1xuXG4gIC8vIEFsdGVyaW5nIHRoZSBzaGFyZWQgb2JqZWN0IGhlcmUsIGJ1dCB0aGlzIGlzIG9rIGFzIHBhcnNlciBpcyBhIHN5bmMgb3BlcmF0aW9uXG4gIHl5LmxvY0luZm8gPSBmdW5jdGlvbihsb2NJbmZvKSB7XG4gICAgcmV0dXJuIG5ldyB5eS5Tb3VyY2VMb2NhdGlvbihvcHRpb25zICYmIG9wdGlvbnMuc3JjTmFtZSwgbG9jSW5mbyk7XG4gIH07XG5cbiAgbGV0IHN0cmlwID0gbmV3IFdoaXRlc3BhY2VDb250cm9sKG9wdGlvbnMpO1xuICByZXR1cm4gc3RyaXAuYWNjZXB0KHBhcnNlci5wYXJzZShpbnB1dCkpO1xufVxuIl19
