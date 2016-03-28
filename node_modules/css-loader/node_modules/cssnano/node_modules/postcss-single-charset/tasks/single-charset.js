"use strict";

module.exports = function (grunt) {
  var pkg = require("../package.json");
  pkg.name = pkg.name.toLowerCase().replace(
    /^postcss-/,
    ""
  ).replace(
    /-(.)/g,
    function (m, c) {
      return c.toUpperCase();
    }
  );

  grunt.registerMultiTask(pkg.name, pkg.description, function () {
    var fs = require("fs-extra");
    var postcss = require("postcss");

    var options = this.options({});

    this.files.forEach(function (file) {
      if (file.src.length !== 1) {
        grunt.fail.warn("This Grunt plugin does not support multiple source files.");
      }

      var src = file.src[0];
      var dest = file.dest;

      if (!fs.existsSync(src)) {
        grunt.log.warn('Source file "' + src + '" not found.');

        return;
      }

      if (options.map) {
        options.from = src;
        options.to = dest;
      }

      var processed = postcss().use(
        require("../index")()
      ).process(
        fs.readFileSync(src, "utf8"), options
      );
      fs.outputFileSync(dest, processed.css);
      grunt.log.writeln('File "' + dest + '" created.');

      if (processed.map) {
        var map = dest + ".map";
        fs.outputFileSync(map, processed.map);
        grunt.log.writeln('File "' + map + '" created.');
      }
    });
  });
};
