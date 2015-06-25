define(function (require) {
  var _ = require('lodash');
  var sessionStorage = window.sessionStorage;

  function Tab(spec) {
    this.id = spec.id;
    this.title = spec.title;
    this.active = false;

    this.rootPath = '/' + this.id;
    this.lastPathStorageKey = 'lastPath:' + this.id;
    this.lastPath = sessionStorage.getItem(this.lastPathStorageKey) || this.rootPath;
  }

  Tab.prototype.pathUpdate = function (path) {
    this.lastPath = path;
    sessionStorage.setItem(this.lastPathStorageKey, this.lastPath);
  };

  return Tab;
});
