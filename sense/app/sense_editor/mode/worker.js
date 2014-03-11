(function (window) {
  "use strict";

  if (typeof window.window !== "undefined" && window.document) {
    return;
  }

  window.console = function () {
    var msgs = Array.prototype.slice.call(arguments, 0);
    window.postMessage({type: "log", data: msgs});
  };
  window.console.error =
    window.console.warn =
      window.console.log =
        window.console.trace = window.console;

  window.window = window;
  window.ace = window;

  window.onerror = function (message, file, line, col, err) {
    console.error("Worker " + err.stack);
  };

  window.normalizeModule = function (parentId, moduleName) {
    if (moduleName.indexOf("!") !== -1) {
      var chunks = moduleName.split("!");
      return window.normalizeModule(parentId, chunks[0]) + "!" + window.normalizeModule(parentId, chunks[1]);
    }
    if (moduleName.charAt(0) == ".") {
      var base = parentId.split("/").slice(0, -1).join("/");
      moduleName = (base ? base + "/" : "") + moduleName;

      var previous;
      while (moduleName.indexOf(".") !== -1 && previous != moduleName) {
        previous = moduleName;
        moduleName = moduleName.replace(/^\.\//, "").replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
      }
    }

    return moduleName;
  };

  window.require = function (parentId, id) {
    if (!id) {
      id = parentId
      parentId = null;
    }
    if (!id.charAt)
      throw new Error("worker.js require() accepts only (parentId, id) as arguments");

    id = window.normalizeModule(parentId, id);

    var module = window.require.modules[id];
    if (module) {
      if (!module.initialized) {
        module.initialized = true;
        module.exports = module.factory().exports;
      }
      return module.exports;
    }

    var chunks = id.split("/");
    if (!window.require.tlns)
      return console.log("unable to load " + id);
    chunks[0] = window.require.tlns[chunks[0]] || chunks[0];
    var path = chunks.join("/") + ".js";

    window.require.id = id;
    window.importScripts(path);
    return window.require(parentId, id);
  };
  window.require.modules = {};
  window.require.tlns = {};

  window.define = function (id, deps, factory) {
    if (arguments.length == 2) {
      factory = deps;
      if (typeof id != "string") {
        deps = id;
        id = window.require.id;
      }
    } else if (arguments.length == 1) {
      factory = id;
      deps = []
      id = window.require.id;
    }

    if (!deps.length)
      deps = ['require', 'exports', 'module']

    if (id.indexOf("text!") === 0)
      return;

    var req = function (childId) {
      return window.require(id, childId);
    };

    window.require.modules[id] = {
      exports: {},
      factory: function () {
        var module = this;
        var returnExports = factory.apply(this, deps.map(function (dep) {
          switch (dep) {
            case 'require':
              return req
            case 'exports':
              return module.exports
            case 'module':
              return module
            default:
              return req(dep)
          }
        }));
        if (returnExports)
          module.exports = returnExports;
        return module;
      }
    };
  };
  window.define.amd = {}

  window.initBaseUrls = function initBaseUrls(topLevelNamespaces) {
    require.tlns = topLevelNamespaces;
  }

  window.initSender = function initSender() {

    var EventEmitter = window.require("ace/lib/event_emitter").EventEmitter;
    var oop = window.require("ace/lib/oop");

    var Sender = function () {
    };

    (function () {

      oop.implement(this, EventEmitter);

      this.callback = function (data, callbackId) {
        window.postMessage({
          type: "call",
          id: callbackId,
          data: data
        });
      };

      this.emit = function (name, data) {
        window.postMessage({
          type: "event",
          name: name,
          data: data
        });
      };

    }).call(Sender.prototype);

    return new Sender();
  }

  window.main = null;
  window.sender = null;

  window.onmessage = function (e) {
    var msg = e.data;
    if (msg.command) {
      if (window.main[msg.command])
        window.main[msg.command].apply(window.main, msg.args);
      else
        throw new Error("Unknown command:" + msg.command);
    }
    else if (msg.init) {
      window.initBaseUrls(msg.tlns);
      require("ace/lib/es5-shim");
      window.sender = window.initSender();
      var clazz = require(msg.module)[msg.classname];
      /*jshint -W055 */
      window.main = new clazz(window.sender);
    }
    else if (msg.event && window.sender) {
      window.sender._emit(msg.event, msg.data);
    }
  };
})(this);// https://github.com/kriskowal/es5-shim

define('ace/lib/oop', ['require', 'exports', 'module' ], function (require, exports, module) {
  "use strict";

  exports.inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

  exports.mixin = function (obj, mixin) {
    for (var key in mixin) {
      obj[key] = mixin[key];
    }
    return obj;
  };

  exports.implement = function (proto, mixin) {
    exports.mixin(proto, mixin);
  };

});
define('ace/worker/mirror', ['require', 'exports', 'module' , 'ace/document', 'ace/lib/lang'], function (require, exports, module) {
  "use strict";

  var Document = require("../document").Document;
  var lang = require("../lib/lang");

  var Mirror = exports.Mirror = function (sender) {
    this.sender = sender;
    var doc = this.doc = new Document("");

    var deferredUpdate = this.deferredUpdate = lang.delayedCall(this.onUpdate.bind(this));

    var _self = this;
    sender.on("change", function (e) {
      doc.applyDeltas(e.data);
      if (_self.$timeout)
        return deferredUpdate.schedule(_self.$timeout);
      _self.onUpdate();
    });
  };

  (function () {

    this.$timeout = 500;

    this.setTimeout = function (timeout) {
      this.$timeout = timeout;
    };

    this.setValue = function (value) {
      this.doc.setValue(value);
      this.deferredUpdate.schedule(this.$timeout);
    };

    this.getValue = function (callbackId) {
      this.sender.callback(this.doc.getValue(), callbackId);
    };

    this.onUpdate = function () {
    };

    this.isPending = function () {
      return this.deferredUpdate.isPending();
    };

  }).call(Mirror.prototype);

});

define('ace/document', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter',
  'ace/range', 'ace/anchor'], function (require, exports, module) {
  "use strict";

  var oop = require("./lib/oop");
  var EventEmitter = require("./lib/event_emitter").EventEmitter;
  var Range = require("./range").Range;
  var Anchor = require("./anchor").Anchor;

  var Document = function (text) {
    this.$lines = [];
    if (text.length == 0) {
      this.$lines = [""];
    } else if (Array.isArray(text)) {
      this._insertLines(0, text);
    } else {
      this.insert({row: 0, column: 0}, text);
    }
  };

  (function () {

    oop.implement(this, EventEmitter);
    this.setValue = function (text) {
      var len = this.getLength();
      this.remove(new Range(0, 0, len, this.getLine(len - 1).length));
      this.insert({row: 0, column: 0}, text);
    };
    this.getValue = function () {
      return this.getAllLines().join(this.getNewLineCharacter());
    };
    this.createAnchor = function (row, column) {
      return new Anchor(this, row, column);
    };
    if ("aaa".split(/a/).length == 0)
      this.$split = function (text) {
        return text.replace(/\r\n|\r/g, "\n").split("\n");
      }
    else
      this.$split = function (text) {
        return text.split(/\r\n|\r|\n/);
      };


    this.$detectNewLine = function (text) {
      var match = text.match(/^.*?(\r\n|\r|\n)/m);
      this.$autoNewLine = match ? match[1] : "\n";
    };
    this.getNewLineCharacter = function () {
      switch (this.$newLineMode) {
        case "windows":
          return "\r\n";
        case "unix":
          return "\n";
        default:
          return this.$autoNewLine;
      }
    };

    this.$autoNewLine = "\n";
    this.$newLineMode = "auto";
    this.setNewLineMode = function (newLineMode) {
      if (this.$newLineMode === newLineMode)
        return;

      this.$newLineMode = newLineMode;
    };
    this.getNewLineMode = function () {
      return this.$newLineMode;
    };
    this.isNewLine = function (text) {
      return (text == "\r\n" || text == "\r" || text == "\n");
    };
    this.getLine = function (row) {
      return this.$lines[row] || "";
    };
    this.getLines = function (firstRow, lastRow) {
      return this.$lines.slice(firstRow, lastRow + 1);
    };
    this.getAllLines = function () {
      return this.getLines(0, this.getLength());
    };
    this.getLength = function () {
      return this.$lines.length;
    };
    this.getTextRange = function (range) {
      if (range.start.row == range.end.row) {
        return this.getLine(range.start.row)
          .substring(range.start.column, range.end.column);
      }
      var lines = this.getLines(range.start.row, range.end.row);
      lines[0] = (lines[0] || "").substring(range.start.column);
      var l = lines.length - 1;
      if (range.end.row - range.start.row == l)
        lines[l] = lines[l].substring(0, range.end.column);
      return lines.join(this.getNewLineCharacter());
    };

    this.$clipPosition = function (position) {
      var length = this.getLength();
      if (position.row >= length) {
        position.row = Math.max(0, length - 1);
        position.column = this.getLine(length - 1).length;
      } else if (position.row < 0)
        position.row = 0;
      return position;
    };
    this.insert = function (position, text) {
      if (!text || text.length === 0)
        return position;

      position = this.$clipPosition(position);
      if (this.getLength() <= 1)
        this.$detectNewLine(text);

      var lines = this.$split(text);
      var firstLine = lines.splice(0, 1)[0];
      var lastLine = lines.length == 0 ? null : lines.splice(lines.length - 1, 1)[0];

      position = this.insertInLine(position, firstLine);
      if (lastLine !== null) {
        position = this.insertNewLine(position); // terminate first line
        position = this._insertLines(position.row, lines);
        position = this.insertInLine(position, lastLine || "");
      }
      return position;
    };
    this.insertLines = function (row, lines) {
      if (row >= this.getLength())
        return this.insert({row: row, column: 0}, "\n" + lines.join("\n"));
      return this._insertLines(Math.max(row, 0), lines);
    };
    this._insertLines = function (row, lines) {
      if (lines.length == 0)
        return {row: row, column: 0};
      var end;
      if (lines.length > 0xFFFF) {
        end = this._insertLines(row, lines.slice(0xFFFF));
        lines = lines.slice(0, 0xFFFF);
      }

      var args = [row, 0];
      args.push.apply(args, lines);
      this.$lines.splice.apply(this.$lines, args);

      var range = new Range(row, 0, row + lines.length, 0);
      var delta = {
        action: "insertLines",
        range: range,
        lines: lines
      };
      this._emit("change", { data: delta });
      return end || range.end;
    };
    this.insertNewLine = function (position) {
      position = this.$clipPosition(position);
      var line = this.$lines[position.row] || "";

      this.$lines[position.row] = line.substring(0, position.column);
      this.$lines.splice(position.row + 1, 0, line.substring(position.column, line.length));

      var end = {
        row: position.row + 1,
        column: 0
      };

      var delta = {
        action: "insertText",
        range: Range.fromPoints(position, end),
        text: this.getNewLineCharacter()
      };
      this._emit("change", { data: delta });

      return end;
    };
    this.insertInLine = function (position, text) {
      if (text.length == 0)
        return position;

      var line = this.$lines[position.row] || "";

      this.$lines[position.row] = line.substring(0, position.column) + text
        + line.substring(position.column);

      var end = {
        row: position.row,
        column: position.column + text.length
      };

      var delta = {
        action: "insertText",
        range: Range.fromPoints(position, end),
        text: text
      };
      this._emit("change", { data: delta });

      return end;
    };
    this.remove = function (range) {
      if (!range instanceof Range)
        range = Range.fromPoints(range.start, range.end);
      range.start = this.$clipPosition(range.start);
      range.end = this.$clipPosition(range.end);

      if (range.isEmpty())
        return range.start;

      var firstRow = range.start.row;
      var lastRow = range.end.row;

      if (range.isMultiLine()) {
        var firstFullRow = range.start.column == 0 ? firstRow : firstRow + 1;
        var lastFullRow = lastRow - 1;

        if (range.end.column > 0)
          this.removeInLine(lastRow, 0, range.end.column);

        if (lastFullRow >= firstFullRow)
          this._removeLines(firstFullRow, lastFullRow);

        if (firstFullRow != firstRow) {
          this.removeInLine(firstRow, range.start.column, this.getLine(firstRow).length);
          this.removeNewLine(range.start.row);
        }
      }
      else {
        this.removeInLine(firstRow, range.start.column, range.end.column);
      }
      return range.start;
    };
    this.removeInLine = function (row, startColumn, endColumn) {
      if (startColumn == endColumn)
        return;

      var range = new Range(row, startColumn, row, endColumn);
      var line = this.getLine(row);
      var removed = line.substring(startColumn, endColumn);
      var newLine = line.substring(0, startColumn) + line.substring(endColumn, line.length);
      this.$lines.splice(row, 1, newLine);

      var delta = {
        action: "removeText",
        range: range,
        text: removed
      };
      this._emit("change", { data: delta });
      return range.start;
    };
    this.removeLines = function (firstRow, lastRow) {
      if (firstRow < 0 || lastRow >= this.getLength())
        return this.remove(new Range(firstRow, 0, lastRow + 1, 0));
      return this._removeLines(firstRow, lastRow);
    };

    this._removeLines = function (firstRow, lastRow) {
      var range = new Range(firstRow, 0, lastRow + 1, 0);
      var removed = this.$lines.splice(firstRow, lastRow - firstRow + 1);

      var delta = {
        action: "removeLines",
        range: range,
        nl: this.getNewLineCharacter(),
        lines: removed
      };
      this._emit("change", { data: delta });
      return removed;
    };
    this.removeNewLine = function (row) {
      var firstLine = this.getLine(row);
      var secondLine = this.getLine(row + 1);

      var range = new Range(row, firstLine.length, row + 1, 0);
      var line = firstLine + secondLine;

      this.$lines.splice(row, 2, line);

      var delta = {
        action: "removeText",
        range: range,
        text: this.getNewLineCharacter()
      };
      this._emit("change", { data: delta });
    };
    this.replace = function (range, text) {
      if (!range instanceof Range)
        range = Range.fromPoints(range.start, range.end);
      if (text.length == 0 && range.isEmpty())
        return range.start;
      if (text == this.getTextRange(range))
        return range.end;

      this.remove(range);
      var end;
      if (text) {
        end = this.insert(range.start, text);
      }
      else {
        end = range.start;
      }

      return end;
    };
    this.applyDeltas = function (deltas) {
      for (var i = 0; i < deltas.length; i++) {
        var delta = deltas[i];
        var range = Range.fromPoints(delta.range.start, delta.range.end);

        if (delta.action == "insertLines")
          this.insertLines(range.start.row, delta.lines);
        else if (delta.action == "insertText")
          this.insert(range.start, delta.text);
        else if (delta.action == "removeLines")
          this._removeLines(range.start.row, range.end.row - 1);
        else if (delta.action == "removeText")
          this.remove(range);
      }
    };
    this.revertDeltas = function (deltas) {
      for (var i = deltas.length - 1; i >= 0; i--) {
        var delta = deltas[i];

        var range = Range.fromPoints(delta.range.start, delta.range.end);

        if (delta.action == "insertLines")
          this._removeLines(range.start.row, range.end.row - 1);
        else if (delta.action == "insertText")
          this.remove(range);
        else if (delta.action == "removeLines")
          this._insertLines(range.start.row, delta.lines);
        else if (delta.action == "removeText")
          this.insert(range.start, delta.text);
      }
    };
    this.indexToPosition = function (index, startRow) {
      var lines = this.$lines || this.getAllLines();
      var newlineLength = this.getNewLineCharacter().length;
      for (var i = startRow || 0, l = lines.length; i < l; i++) {
        index -= lines[i].length + newlineLength;
        if (index < 0)
          return {row: i, column: index + lines[i].length + newlineLength};
      }
      return {row: l - 1, column: lines[l - 1].length};
    };
    this.positionToIndex = function (pos, startRow) {
      var lines = this.$lines || this.getAllLines();
      var newlineLength = this.getNewLineCharacter().length;
      var index = 0;
      var row = Math.min(pos.row, lines.length);
      for (var i = startRow || 0; i < row; ++i)
        index += lines[i].length + newlineLength;

      return index + pos.column;
    };

  }).call(Document.prototype);

  exports.Document = Document;
});

define('ace/lib/event_emitter', ['require', 'exports', 'module' ], function (require, exports, module) {
  "use strict";

  var EventEmitter = {};
  var stopPropagation = function () {
    this.propagationStopped = true;
  };
  var preventDefault = function () {
    this.defaultPrevented = true;
  };

  EventEmitter._emit =
    EventEmitter._dispatchEvent = function (eventName, e) {
      this._eventRegistry || (this._eventRegistry = {});
      this._defaultHandlers || (this._defaultHandlers = {});

      var listeners = this._eventRegistry[eventName] || [];
      var defaultHandler = this._defaultHandlers[eventName];
      if (!listeners.length && !defaultHandler)
        return;

      if (typeof e != "object" || !e)
        e = {};

      if (!e.type)
        e.type = eventName;
      if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
      if (!e.preventDefault)
        e.preventDefault = preventDefault;

      listeners = listeners.slice();
      for (var i = 0; i < listeners.length; i++) {
        listeners[i](e, this);
        if (e.propagationStopped)
          break;
      }

      if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
    };


  EventEmitter._signal = function (eventName, e) {
    var listeners = (this._eventRegistry || {})[eventName];
    if (!listeners)
      return;
    listeners = listeners.slice();
    for (var i = 0; i < listeners.length; i++)
      listeners[i](e, this);
  };

  EventEmitter.once = function (eventName, callback) {
    var _self = this;
    callback && this.addEventListener(eventName, function newCallback() {
      _self.removeEventListener(eventName, newCallback);
      callback.apply(null, arguments);
    });
  };


  EventEmitter.setDefaultHandler = function (eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
      handlers = this._defaultHandlers = {_disabled_: {}};

    if (handlers[eventName]) {
      var old = handlers[eventName];
      var disabled = handlers._disabled_[eventName];
      if (!disabled)
        handlers._disabled_[eventName] = disabled = [];
      disabled.push(old);
      var i = disabled.indexOf(callback);
      if (i != -1)
        disabled.splice(i, 1);
    }
    handlers[eventName] = callback;
  };
  EventEmitter.removeDefaultHandler = function (eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
      return;
    var disabled = handlers._disabled_[eventName];

    if (handlers[eventName] == callback) {
      var old = handlers[eventName];
      if (disabled)
        this.setDefaultHandler(eventName, disabled.pop());
    } else if (disabled) {
      var i = disabled.indexOf(callback);
      if (i != -1)
        disabled.splice(i, 1);
    }
  };

  EventEmitter.on =
    EventEmitter.addEventListener = function (eventName, callback, capturing) {
      this._eventRegistry = this._eventRegistry || {};

      var listeners = this._eventRegistry[eventName];
      if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

      if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
      return callback;
    };

  EventEmitter.off =
    EventEmitter.removeListener =
      EventEmitter.removeEventListener = function (eventName, callback) {
        this._eventRegistry = this._eventRegistry || {};

        var listeners = this._eventRegistry[eventName];
        if (!listeners)
          return;

        var index = listeners.indexOf(callback);
        if (index !== -1)
          listeners.splice(index, 1);
      };

  EventEmitter.removeAllListeners = function (eventName) {
    if (this._eventRegistry) this._eventRegistry[eventName] = [];
  };

  exports.EventEmitter = EventEmitter;

});

define('ace/range', ['require', 'exports', 'module' ], function (require, exports, module) {
  "use strict";

  var comparePoints = function (p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
  };
  var Range = function (startRow, startColumn, endRow, endColumn) {
    this.start = {
      row: startRow,
      column: startColumn
    };

    this.end = {
      row: endRow,
      column: endColumn
    };
  };

  (function () {
    this.isEqual = function (range) {
      return this.start.row === range.start.row &&
        this.end.row === range.end.row &&
        this.start.column === range.start.column &&
        this.end.column === range.end.column;
    };
    this.toString = function () {
      return ("Range: [" + this.start.row + "/" + this.start.column +
        "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    this.contains = function (row, column) {
      return this.compare(row, column) == 0;
    };
    this.compareRange = function (range) {
      var cmp,
        end = range.end,
        start = range.start;

      cmp = this.compare(end.row, end.column);
      if (cmp == 1) {
        cmp = this.compare(start.row, start.column);
        if (cmp == 1) {
          return 2;
        } else if (cmp == 0) {
          return 1;
        } else {
          return 0;
        }
      } else if (cmp == -1) {
        return -2;
      } else {
        cmp = this.compare(start.row, start.column);
        if (cmp == -1) {
          return -1;
        } else if (cmp == 1) {
          return 42;
        } else {
          return 0;
        }
      }
    };
    this.comparePoint = function (p) {
      return this.compare(p.row, p.column);
    };
    this.containsRange = function (range) {
      return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    };
    this.intersects = function (range) {
      var cmp = this.compareRange(range);
      return (cmp == -1 || cmp == 0 || cmp == 1);
    };
    this.isEnd = function (row, column) {
      return this.end.row == row && this.end.column == column;
    };
    this.isStart = function (row, column) {
      return this.start.row == row && this.start.column == column;
    };
    this.setStart = function (row, column) {
      if (typeof row == "object") {
        this.start.column = row.column;
        this.start.row = row.row;
      } else {
        this.start.row = row;
        this.start.column = column;
      }
    };
    this.setEnd = function (row, column) {
      if (typeof row == "object") {
        this.end.column = row.column;
        this.end.row = row.row;
      } else {
        this.end.row = row;
        this.end.column = column;
      }
    };
    this.inside = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isEnd(row, column) || this.isStart(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    };
    this.insideStart = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isEnd(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    };
    this.insideEnd = function (row, column) {
      if (this.compare(row, column) == 0) {
        if (this.isStart(row, column)) {
          return false;
        } else {
          return true;
        }
      }
      return false;
    };
    this.compare = function (row, column) {
      if (!this.isMultiLine()) {
        if (row === this.start.row) {
          return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
        }
      }

      if (row < this.start.row)
        return -1;

      if (row > this.end.row)
        return 1;

      if (this.start.row === row)
        return column >= this.start.column ? 0 : -1;

      if (this.end.row === row)
        return column <= this.end.column ? 0 : 1;

      return 0;
    };
    this.compareStart = function (row, column) {
      if (this.start.row == row && this.start.column == column) {
        return -1;
      } else {
        return this.compare(row, column);
      }
    };
    this.compareEnd = function (row, column) {
      if (this.end.row == row && this.end.column == column) {
        return 1;
      } else {
        return this.compare(row, column);
      }
    };
    this.compareInside = function (row, column) {
      if (this.end.row == row && this.end.column == column) {
        return 1;
      } else if (this.start.row == row && this.start.column == column) {
        return -1;
      } else {
        return this.compare(row, column);
      }
    };
    this.clipRows = function (firstRow, lastRow) {
      var start, end;
      if (this.end.row > lastRow)
        end = {row: lastRow + 1, column: 0};
      else if (this.end.row < firstRow)
        end = {row: firstRow, column: 0};

      if (this.start.row > lastRow)
        start = {row: lastRow + 1, column: 0};
      else if (this.start.row < firstRow)
        start = {row: firstRow, column: 0};

      return Range.fromPoints(start || this.start, end || this.end);
    };
    this.extend = function (row, column) {
      var cmp = this.compare(row, column);
      var start, end;
      if (cmp == 0)
        return this;
      else if (cmp == -1)
        start = {row: row, column: column};
      else
        end = {row: row, column: column};

      return Range.fromPoints(start || this.start, end || this.end);
    };

    this.isEmpty = function () {
      return (this.start.row === this.end.row && this.start.column === this.end.column);
    };
    this.isMultiLine = function () {
      return (this.start.row !== this.end.row);
    };
    this.clone = function () {
      return Range.fromPoints(this.start, this.end);
    };
    this.collapseRows = function () {
      if (this.end.column == 0)
        return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0)
      else
        return new Range(this.start.row, 0, this.end.row, 0)
    };
    this.toScreenRange = function (session) {
      var screenPosStart = session.documentToScreenPosition(this.start);
      var screenPosEnd = session.documentToScreenPosition(this.end);

      return new Range(
        screenPosStart.row, screenPosStart.column,
        screenPosEnd.row, screenPosEnd.column
      );
    };
    this.moveBy = function (row, column) {
      this.start.row += row;
      this.start.column += column;
      this.end.row += row;
      this.end.column += column;
    };

  }).call(Range.prototype);
  Range.fromPoints = function (start, end) {
    return new Range(start.row, start.column, end.row, end.column);
  };
  Range.comparePoints = comparePoints;

  Range.comparePoints = function (p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
  };


  exports.Range = Range;
});

define('ace/anchor', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter'], function (require, exports, module) {
  "use strict";

  var oop = require("./lib/oop");
  var EventEmitter = require("./lib/event_emitter").EventEmitter;

  var Anchor = exports.Anchor = function (doc, row, column) {
    this.$onChange = this.onChange.bind(this);
    this.attach(doc);

    if (typeof column == "undefined")
      this.setPosition(row.row, row.column);
    else
      this.setPosition(row, column);
  };

  (function () {

    oop.implement(this, EventEmitter);
    this.getPosition = function () {
      return this.$clipPositionToDocument(this.row, this.column);
    };
    this.getDocument = function () {
      return this.document;
    };
    this.$insertRight = false;
    this.onChange = function (e) {
      var delta = e.data;
      var range = delta.range;

      if (range.start.row == range.end.row && range.start.row != this.row)
        return;

      if (range.start.row > this.row)
        return;

      if (range.start.row == this.row && range.start.column > this.column)
        return;

      var row = this.row;
      var column = this.column;
      var start = range.start;
      var end = range.end;

      if (delta.action === "insertText") {
        if (start.row === row && start.column <= column) {
          if (start.column === column && this.$insertRight) {
          } else if (start.row === end.row) {
            column += end.column - start.column;
          } else {
            column -= start.column;
            row += end.row - start.row;
          }
        } else if (start.row !== end.row && start.row < row) {
          row += end.row - start.row;
        }
      } else if (delta.action === "insertLines") {
        if (start.row <= row) {
          row += end.row - start.row;
        }
      } else if (delta.action === "removeText") {
        if (start.row === row && start.column < column) {
          if (end.column >= column)
            column = start.column;
          else
            column = Math.max(0, column - (end.column - start.column));

        } else if (start.row !== end.row && start.row < row) {
          if (end.row === row)
            column = Math.max(0, column - end.column) + start.column;
          row -= (end.row - start.row);
        } else if (end.row === row) {
          row -= end.row - start.row;
          column = Math.max(0, column - end.column) + start.column;
        }
      } else if (delta.action == "removeLines") {
        if (start.row <= row) {
          if (end.row <= row)
            row -= end.row - start.row;
          else {
            row = start.row;
            column = 0;
          }
        }
      }

      this.setPosition(row, column, true);
    };
    this.setPosition = function (row, column, noClip) {
      var pos;
      if (noClip) {
        pos = {
          row: row,
          column: column
        };
      } else {
        pos = this.$clipPositionToDocument(row, column);
      }

      if (this.row == pos.row && this.column == pos.column)
        return;

      var old = {
        row: this.row,
        column: this.column
      };

      this.row = pos.row;
      this.column = pos.column;
      this._emit("change", {
        old: old,
        value: pos
      });
    };
    this.detach = function () {
      this.document.removeEventListener("change", this.$onChange);
    };
    this.attach = function (doc) {
      this.document = doc || this.document;
      this.document.on("change", this.$onChange);
    };
    this.$clipPositionToDocument = function (row, column) {
      var pos = {};

      if (row >= this.document.getLength()) {
        pos.row = Math.max(0, this.document.getLength() - 1);
        pos.column = this.document.getLine(pos.row).length;
      }
      else if (row < 0) {
        pos.row = 0;
        pos.column = 0;
      }
      else {
        pos.row = row;
        pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
      }

      if (column < 0)
        pos.column = 0;

      return pos;
    };

  }).call(Anchor.prototype);

});

define('ace/lib/lang', ['require', 'exports', 'module' ], function (require, exports, module) {
  "use strict";

  exports.stringReverse = function (string) {
    return string.split("").reverse().join("");
  };

  exports.stringRepeat = function (string, count) {
    var result = '';
    while (count > 0) {
      if (count & 1)
        result += string;

      if (count >>= 1)
        string += string;
    }
    return result;
  };

  var trimBeginRegexp = /^\s\s*/;
  var trimEndRegexp = /\s\s*$/;

  exports.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
  };

  exports.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
  };

  exports.copyObject = function (obj) {
    var copy = {};
    for (var key in obj) {
      copy[key] = obj[key];
    }
    return copy;
  };

  exports.copyArray = function (array) {
    var copy = [];
    for (var i = 0, l = array.length; i < l; i++) {
      if (array[i] && typeof array[i] == "object")
        copy[i] = this.copyObject(array[i]);
      else
        copy[i] = array[i];
    }
    return copy;
  };

  exports.deepCopy = function (obj) {
    if (typeof obj !== "object" || !obj)
      return obj;
    var cons = obj.constructor;
    if (cons === RegExp)
      return obj;

    var copy = cons();
    for (var key in obj) {
      if (typeof obj[key] === "object") {
        copy[key] = exports.deepCopy(obj[key]);
      } else {
        copy[key] = obj[key];
      }
    }
    return copy;
  };

  exports.arrayToMap = function (arr) {
    var map = {};
    for (var i = 0; i < arr.length; i++) {
      map[arr[i]] = 1;
    }
    return map;

  };

  exports.createMap = function (props) {
    var map = Object.create(null);
    for (var i in props) {
      map[i] = props[i];
    }
    return map;
  };
  exports.arrayRemove = function (array, value) {
    for (var i = 0; i <= array.length; i++) {
      if (value === array[i]) {
        array.splice(i, 1);
      }
    }
  };

  exports.escapeRegExp = function (str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
  };

  exports.escapeHTML = function (str) {
    return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
  };

  exports.getMatchOffsets = function (string, regExp) {
    var matches = [];

    string.replace(regExp, function (str) {
      matches.push({
        offset: arguments[arguments.length - 2],
        length: str.length
      });
    });

    return matches;
  };
  exports.deferredCall = function (fcn) {

    var timer = null;
    var callback = function () {
      timer = null;
      fcn();
    };

    var deferred = function (timeout) {
      deferred.cancel();
      timer = setTimeout(callback, timeout || 0);
      return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function () {
      this.cancel();
      fcn();
      return deferred;
    };

    deferred.cancel = function () {
      clearTimeout(timer);
      timer = null;
      return deferred;
    };

    deferred.isPending = function () {
      return timer;
    };

    return deferred;
  };


  exports.delayedCall = function (fcn, defaultTimeout) {
    var timer = null;
    var callback = function () {
      timer = null;
      fcn();
    };

    var _self = function (timeout) {
      if (timer == null)
        timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = function (timeout) {
      timer && clearTimeout(timer);
      timer = setTimeout(callback, timeout || defaultTimeout);
    };
    _self.schedule = _self;

    _self.call = function () {
      this.cancel();
      fcn();
    };

    _self.cancel = function () {
      timer && clearTimeout(timer);
      timer = null;
    };

    _self.isPending = function () {
      return timer;
    };

    return _self;
  };
});


define("sense_editor/mode/worker_parser", ['require', 'exports', 'module' ], function (require, exports, module) {
  "use strict";

  var at,     // The index of the current character
    ch,     // The current character
    annos, // annotations
    escapee = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t'
    },
    text,

    annotate = function (type, text) {
      annos.push({type: type, text: text, at: at});
    },

    error = function (m) {

      throw {
        name: 'SyntaxError',
        message: m,
        at: at,
        text: text
      };
    },


    reset = function (newAt) {
      ch = text.charAt(newAt);
      at = newAt + 1;
    },

    next = function (c) {

      if (c && c !== ch) {
        error("Expected '" + c + "' instead of '" + ch + "'");
      }

      ch = text.charAt(at);
      at += 1;
      return ch;
    },

    number = function () {

      var number,
        string = '';

      if (ch === '-') {
        string = '-';
        next('-');
      }
      while (ch >= '0' && ch <= '9') {
        string += ch;
        next();
      }
      if (ch === '.') {
        string += '.';
        while (next() && ch >= '0' && ch <= '9') {
          string += ch;
        }
      }
      if (ch === 'e' || ch === 'E') {
        string += ch;
        next();
        if (ch === '-' || ch === '+') {
          string += ch;
          next();
        }
        while (ch >= '0' && ch <= '9') {
          string += ch;
          next();
        }
      }
      number = +string;
      if (isNaN(number)) {
        error("Bad number");
      } else {
        return number;
      }
    },

    string = function () {

      var hex,
        i,
        string = '',
        uffff;

      if (ch === '"') {
        while (next()) {
          if (ch === '"') {
            next();
            return string;
          } else if (ch === '\\') {
            next();
            if (ch === 'u') {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) {
                  break;
                }
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === 'string') {
              string += escapee[ch];
            } else {
              break;
            }
          } else {
            string += ch;
          }
        }
      }
      error("Bad string");
    },

    white = function () {

      while (ch && ch <= ' ') {
        next();
      }
    },

    strictWhite = function () {

      while (ch && ( ch == ' ' || ch == '\t')) {
        next();
      }
    },

    newLine = function () {
      if (ch == '\n') next();
    },

    word = function () {

      switch (ch) {
        case 't':
          next('t');
          next('r');
          next('u');
          next('e');
          return true;
        case 'f':
          next('f');
          next('a');
          next('l');
          next('s');
          next('e');
          return false;
        case 'n':
          next('n');
          next('u');
          next('l');
          next('l');
          return null;
      }
      error("Unexpected '" + ch + "'");
    },

  // parses and returns the method
    method = function () {
      switch (ch) {
        case 'G':
          next('G');
          next('E');
          next('T');
          return "GET";
        case 'H':
          next('H');
          next('E');
          next('A');
          next('D');
          return "HEAD";
        case 'D':
          next('D');
          next('E');
          next('L');
          next('E');
          next('T');
          next('E');
          return "DELETE";
        case 'P':
          next('P');
          switch (ch) {
            case 'U':
              next('U');
              next('T');
              return "PUT";
            case 'O':
              next('O');
              next('S');
              next('T');
              return "POST";
            default:
              error("Unexpected '" + ch + "'");
          }
          break;
        default:
          error("Expected one of GET/POST/PUT/DELETE/HEAD");
      }

    },

    value,  // Place holder for the value function.

    array = function () {

      var array = [];

      if (ch === '[') {
        next('[');
        white();
        if (ch === ']') {
          next(']');
          return array;   // empty array
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === ']') {
            next(']');
            return array;
          }
          next(',');
          white();
        }
      }
      error("Bad array");
    },

    object = function () {

      var key,
        object = {};

      if (ch === '{') {
        next('{');
        white();
        if (ch === '}') {
          next('}');
          return object;   // empty object
        }
        while (ch) {
          key = string();
          white();
          next(':');
          if (Object.hasOwnProperty.call(object, key)) {
            error('Duplicate key "' + key + '"');
          }
          object[key] = value();
          white();
          if (ch === '}') {
            next('}');
            return object;
          }
          next(',');
          white();
        }
      }
      error("Bad object");
    };

  value = function () {

    white();
    switch (ch) {
      case '{':
        return object();
      case '[':
        return array();
      case '"':
        return string();
      case '-':
        return number();
      default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
  };

  var url = function () {

      var url = '';
      while (ch && ch != '\n') {
        url += ch;
        next();
      }
      if (url == '')
        error('Missing url');
      return url;
    },

    request = function () {
      white();
      var meth = method();
      strictWhite();
      url();
      strictWhite(); // advance to one new line
      newLine();
      strictWhite();
      if (ch == '{') {
        object();
      }
      // multi doc request
      strictWhite(); // advance to one new line
      newLine();
      strictWhite();
      while (ch == '{') {
        // another object
        object();
        strictWhite();
        newLine();
        strictWhite();
      }

    },

    comment = function () {
      while (ch == '#') {
        while (ch && ch !== '\n') {
          next();
        }
        white();
      }
    },

    multi_request = function () {
      while (ch && ch != '') {
        white();
        if (!ch) {
          continue;
        }
        try {
          comment();
          white();
          if (!ch) {
            continue;
          }
          request();
          white();
        }
        catch (e) {
          annotate("error", e.message);
          // snap
          var substring = text.substr(at);
          var nextMatch = substring.search(/^POST|HEAD|GET|PUT|DELETE/m);
          if (nextMatch < 1) return;
          reset(at + nextMatch);
        }
      }
    };


  return function (source, reviver) {
    var result;

    text = source;
    at = 0;
    annos = [];
    next();
    multi_request();
    white();
    if (ch) {
      annotate("error", "Syntax error");
    }

    result = { "annotations": annos };


    return typeof reviver === 'function' ? (function walk(holder, key) {
      var k, v, value = holder[key];
      if (value && typeof value === 'object') {
        for (k in value) {
          if (Object.hasOwnProperty.call(value, k)) {
            v = walk(value, k);
            if (v !== undefined) {
              value[k] = v;
            } else {
              delete value[k];
            }
          }
        }
      }
      return reviver.call(holder, key, value);
    })({'': result}, '') : result;
  };
});


define("sense_editor/mode/worker", ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/worker/mirror',
  'sense_editor/mode/worker_parser'], function (require, exports, module) {
  "use strict";


  var oop = require("ace/lib/oop");
  var Mirror = require("ace/worker/mirror").Mirror;
  var parse = require("sense_editor/mode/worker_parser");

  var SenseWorker = exports.SenseWorker = function (sender) {
    Mirror.call(this, sender);
    this.setTimeout(200);
  };

  oop.inherits(SenseWorker, Mirror);

  (function () {

    this.onUpdate = function () {
      var value = this.doc.getValue();
      var pos, result;
      try {
        result = parse(value);
      } catch (e) {
        pos = this.charToDocumentPosition(e.at - 1);
        this.sender.emit("error", {
          row: pos.row,
          column: pos.column,
          text: e.message,
          type: "error"
        });
        return;
      }
      for (var i = 0; i < result.annotations.length; i++) {
        pos = this.charToDocumentPosition(result.annotations[i].at - 1);
        result.annotations[i].row = pos.row;
        result.annotations[i].column = pos.column;

      }
      this.sender.emit("ok", result.annotations);
    };

    this.charToDocumentPosition = function (charPos) {
      var i = 0;
      var len = this.doc.getLength();
      var nl = this.doc.getNewLineCharacter().length;

      if (!len) {
        return { row: 0, column: 0};
      }

      var lineStart = 0, line;
      while (i < len) {
        line = this.doc.getLine(i);
        var lineLength = line.length + nl;
        if (lineStart + lineLength > charPos)
          return {
            row: i,
            column: charPos - lineStart
          };

        lineStart += lineLength;
        i += 1;
      }

      return {
        row: i - 1,
        column: line.length
      };
    };

  }).call(SenseWorker.prototype);

});

