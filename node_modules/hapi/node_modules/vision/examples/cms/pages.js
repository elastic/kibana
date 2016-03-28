// Load modules

var Fs = require('fs');
var Path = require('path');


// Declare internals

var internals = {};


internals.Pages = function (dirPath) {

    this._dirPath = dirPath;
    this._cache = {};
    this.loadPagesIntoCache();
};


internals.Pages.prototype.loadPagesIntoCache = function () {

    var self = this;
    Fs.readdirSync(this._dirPath).forEach(function (file) {

        if (file[0] !== '.') {
            self._cache[file] = self.loadPageFile(file);
        }
    });
};


internals.Pages.prototype.getAll = function () {

    return this._cache;
};


internals.Pages.prototype.getPage = function (name) {

    return this._cache[name];
};


internals.Pages.prototype.savePage = function (name, contents) {

    name = Path.normalize(name);
    Fs.writeFileSync(Path.join(this._dirPath, name), contents);
    this._cache[name] = {
        name: name,
        contents: contents
    };
};


internals.Pages.prototype.loadPageFile = function (file) {

    var contents = Fs.readFileSync(Path.join(this._dirPath, file));

    return {
        name: file,
        contents: contents.toString()
    };
};

exports = module.exports = new internals.Pages(Path.join(__dirname, '_pages'));
