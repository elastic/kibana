"use strict";

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _pathExists = require("path-exists");

var _pathExists2 = _interopRequireDefault(_pathExists);

var _readline = require("readline");

var _readline2 = _interopRequireDefault(_readline);

var _child_process = require("child_process");

var _child_process2 = _interopRequireDefault(_child_process);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function spawn(cmd, args, callback) {
  console.log(">", cmd, args);

  var spawn = _child_process2["default"].spawn(cmd, args, { stdio: "inherit" });

  spawn.on("exit", function (code) {
    if (code === 0) {
      callback();
    } else {
      console.log("Killing...");
      process.exit(1);
    }
  });
}

function spawnMultiple(cmds) {
  function next() {
    var cmd = cmds.shift();
    if (cmd) {
      spawn(cmd.command, cmd.args, next);
    } else {
      process.exit();
    }
  }

  next();
}

function template(name) {
  var data = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var source = _fs2["default"].readFileSync(_path2["default"].join(__dirname, "templates", name), "utf8");
  source = source.replace(/[A-Z_]+/g, function (key) {
    return data[key] === undefined ? key : data[key];
  });
  return source;
}

function write(filename, content) {
  console.log(filename);
  _fs2["default"].writeFileSync(filename, content);
}

function execMaybe(cmd) {
  try {
    return _child_process2["default"].execSync(cmd).toString();
  } catch (err) {
    return "";
  }
}

var rl = _readline2["default"].createInterface({
  input: process.stdin,
  output: process.stdout
});

var BABEL_PLUGIN_PREFIX = "babel-plugin-";

var cmds = {
  init: function init() {
    var name = _path2["default"].basename(process.cwd());

    if (name.indexOf(BABEL_PLUGIN_PREFIX) === 0) {
      name = name.slice(BABEL_PLUGIN_PREFIX.length);
    }

    rl.question("Description (optional): ", function (description) {
      var remote = execMaybe("git config --get remote.origin.url").trim().match(/git@github.com:(.*?).git/);
      if (remote) {
        build(description, remote[1]);
      } else {
        rl.question("GitHub Repository (eg. sebmck/babel-plugin-foobar) (optional): ", function (repo) {
          build(description, repo);
        });
      }
    });

    function build(description, repo) {
      rl.close();

      var templateData = {
        DESCRIPTION: description,
        FULL_NAME: BABEL_PLUGIN_PREFIX + name,
        NAME: name
      };

      write("package.json", JSON.stringify({
        name: templateData.FULL_NAME,
        version: "1.0.0",
        description: templateData.DESCRIPTION,
        repository: repo || undefined,
        license: "MIT",
        main: "lib/index.js",

        devDependencies: {
          babel: "^5.6.0"
        },

        scripts: {
          build: "babel-plugin build",
          push: "babel-plugin publish",
          test: "babel-plugin test"
        },

        keywords: ["babel-plugin"]
      }, null, "  ") + "\n");

      write(".npmignore", "node_modules\n*.log\nsrc\n");

      write(".gitignore", "node_modules\n*.log\nlib\n");

      write("README.md", template("README.md", templateData));

      write("LICENSE", template("LICENSE", {
        AUTHOR_EMAIL: execMaybe("git config --get user.email").trim(),
        AUTHOR_NAME: execMaybe("git config --get user.name").trim(),
        YEAR: new Date().getFullYear()
      }));

      if (!_pathExists2["default"].sync("src")) {
        _fs2["default"].mkdirSync("src");
        write("src/index.js", template("index.js", templateData));
      }
    }
  },

  build: function build() {
    spawn("babel", ["src", "--out-dir", "lib", "--copy-files"], process.exit);
  },

  publish: function publish() {
    var pkg = require(process.cwd() + "/package.json");
    console.log("Current version:", pkg.version);

    rl.question("New version (enter nothing for patch): ", function (newVersion) {
      rl.close();

      newVersion = newVersion || "patch";

      spawnMultiple([{ command: "git", args: ["pull"] }, { command: "git", args: ["push"] }, { command: "babel-plugin", args: ["build"] }, { command: "npm", args: ["version", newVersion] }, { command: "npm", args: ["publish"] }, { command: "git", args: ["push", "--follow-tags"] }]);
    });
  }
};

var cmd = cmds[process.argv[2]];
if (cmd) {
  cmd();
} else {
  console.error("Unknown command:", cmd);
  process.exit(1);
}