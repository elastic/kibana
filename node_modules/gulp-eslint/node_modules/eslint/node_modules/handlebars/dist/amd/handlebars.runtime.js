define(['exports', 'module', './handlebars/base', './handlebars/safe-string', './handlebars/exception', './handlebars/utils', './handlebars/runtime', './handlebars/no-conflict'], function (exports, module, _handlebarsBase, _handlebarsSafeString, _handlebarsException, _handlebarsUtils, _handlebarsRuntime, _handlebarsNoConflict) {
  'use strict';

  // istanbul ignore next

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  // Each of these augment the Handlebars object. No need to setup here.
  // (This is done to easily share code between commonjs and browse envs)

  var _SafeString = _interopRequireDefault(_handlebarsSafeString);

  var _Exception = _interopRequireDefault(_handlebarsException);

  var _noConflict = _interopRequireDefault(_handlebarsNoConflict);

  // For compatibility and usage outside of module systems, make the Handlebars object a namespace
  function create() {
    var hb = new _handlebarsBase.HandlebarsEnvironment();

    _handlebarsUtils.extend(hb, _handlebarsBase);
    hb.SafeString = _SafeString['default'];
    hb.Exception = _Exception['default'];
    hb.Utils = _handlebarsUtils;
    hb.escapeExpression = _handlebarsUtils.escapeExpression;

    hb.VM = _handlebarsRuntime;
    hb.template = function (spec) {
      return _handlebarsRuntime.template(spec, hb);
    };

    return hb;
  }

  var inst = create();
  inst.create = create;

  _noConflict['default'](inst);

  inst['default'] = inst;

  module.exports = inst;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpYi9oYW5kbGViYXJzLnJ1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFZQSxXQUFTLE1BQU0sR0FBRztBQUNoQixRQUFJLEVBQUUsR0FBRyxJQUFJLGdCQUFLLHFCQUFxQixFQUFFLENBQUM7O0FBRTFDLHFCQUFNLE1BQU0sQ0FBQyxFQUFFLGtCQUFPLENBQUM7QUFDdkIsTUFBRSxDQUFDLFVBQVUseUJBQWEsQ0FBQztBQUMzQixNQUFFLENBQUMsU0FBUyx3QkFBWSxDQUFDO0FBQ3pCLE1BQUUsQ0FBQyxLQUFLLG1CQUFRLENBQUM7QUFDakIsTUFBRSxDQUFDLGdCQUFnQixHQUFHLGlCQUFNLGdCQUFnQixDQUFDOztBQUU3QyxNQUFFLENBQUMsRUFBRSxxQkFBVSxDQUFDO0FBQ2hCLE1BQUUsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFJLEVBQUU7QUFDM0IsYUFBTyxtQkFBUSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ25DLENBQUM7O0FBRUYsV0FBTyxFQUFFLENBQUM7R0FDWDs7QUFFRCxNQUFJLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQztBQUNwQixNQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQzs7QUFFckIseUJBQVcsSUFBSSxDQUFDLENBQUM7O0FBRWpCLE1BQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUM7O21CQUVSLElBQUkiLCJmaWxlIjoibGliL2hhbmRsZWJhcnMucnVudGltZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGJhc2UgZnJvbSAnLi9oYW5kbGViYXJzL2Jhc2UnO1xuXG4vLyBFYWNoIG9mIHRoZXNlIGF1Z21lbnQgdGhlIEhhbmRsZWJhcnMgb2JqZWN0LiBObyBuZWVkIHRvIHNldHVwIGhlcmUuXG4vLyAoVGhpcyBpcyBkb25lIHRvIGVhc2lseSBzaGFyZSBjb2RlIGJldHdlZW4gY29tbW9uanMgYW5kIGJyb3dzZSBlbnZzKVxuaW1wb3J0IFNhZmVTdHJpbmcgZnJvbSAnLi9oYW5kbGViYXJzL3NhZmUtc3RyaW5nJztcbmltcG9ydCBFeGNlcHRpb24gZnJvbSAnLi9oYW5kbGViYXJzL2V4Y2VwdGlvbic7XG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuL2hhbmRsZWJhcnMvdXRpbHMnO1xuaW1wb3J0ICogYXMgcnVudGltZSBmcm9tICcuL2hhbmRsZWJhcnMvcnVudGltZSc7XG5cbmltcG9ydCBub0NvbmZsaWN0IGZyb20gJy4vaGFuZGxlYmFycy9uby1jb25mbGljdCc7XG5cbi8vIEZvciBjb21wYXRpYmlsaXR5IGFuZCB1c2FnZSBvdXRzaWRlIG9mIG1vZHVsZSBzeXN0ZW1zLCBtYWtlIHRoZSBIYW5kbGViYXJzIG9iamVjdCBhIG5hbWVzcGFjZVxuZnVuY3Rpb24gY3JlYXRlKCkge1xuICBsZXQgaGIgPSBuZXcgYmFzZS5IYW5kbGViYXJzRW52aXJvbm1lbnQoKTtcblxuICBVdGlscy5leHRlbmQoaGIsIGJhc2UpO1xuICBoYi5TYWZlU3RyaW5nID0gU2FmZVN0cmluZztcbiAgaGIuRXhjZXB0aW9uID0gRXhjZXB0aW9uO1xuICBoYi5VdGlscyA9IFV0aWxzO1xuICBoYi5lc2NhcGVFeHByZXNzaW9uID0gVXRpbHMuZXNjYXBlRXhwcmVzc2lvbjtcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59XG5cbmxldCBpbnN0ID0gY3JlYXRlKCk7XG5pbnN0LmNyZWF0ZSA9IGNyZWF0ZTtcblxubm9Db25mbGljdChpbnN0KTtcblxuaW5zdFsnZGVmYXVsdCddID0gaW5zdDtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdDtcbiJdfQ==
